import dns from "dns/promises"

import { retry } from "@octokit/plugin-retry"
import { Octokit } from "@octokit/rest"
import autoBind from "auto-bind"
import axios from "axios"
import _ from "lodash"
import { errAsync, okAsync, ResultAsync } from "neverthrow"

import parentLogger from "@logger/logger"

import config from "@root/config/config"
import MonitoringError from "@root/errors/MonitoringError"
import LaunchesService from "@root/services/identity/LaunchesService"
import promisifyPapaParse from "@root/utils/papa-parse"

interface MonitoringServiceInterface {
  launchesService: LaunchesService
}

const IsomerHostedDomainType = {
  REDIRECTION: "redirection",
  INDIRECTION: "indirection",
  KEYCDN: "keycdn",
  AMPLIFY: "amplify",
} as const

interface IsomerHostedDomain {
  domain: string
  type: typeof IsomerHostedDomainType[keyof typeof IsomerHostedDomainType]
}

type KeyCdnZoneAlias = {
  name: string
}

interface RedirectionDomain {
  source: string
  target: string
}

interface ReportCard {
  domain: string
  type: typeof IsomerHostedDomainType[keyof typeof IsomerHostedDomainType]
  aRecord: string[]
  quadArecord: string[]
  cNameRecord: string[]
  caaRecord: string[]
}

function isKeyCdnZoneAlias(object: unknown): object is KeyCdnZoneAlias {
  return "name" in (object as KeyCdnZoneAlias)
}

function isKeyCdnResponse(object: unknown): object is KeyCdnZoneAlias[] {
  if (!object) return false
  if (Array.isArray(object)) return object.every(isKeyCdnZoneAlias)
  return false
}

export default class MonitoringService {
  private readonly launchesService: MonitoringServiceInterface["launchesService"]

  private readonly monitoringServiceLogger = parentLogger.child({
    module: "monitoringService",
  })

  constructor({ launchesService }: MonitoringServiceInterface) {
    autoBind(this)
    this.launchesService = launchesService
  }

  getKeyCdnDomains() {
    const keyCdnApiKey = config.get("keyCdn.apiKey")

    return ResultAsync.fromPromise(
      axios.get(`https://api.keycdn.com/zonealiases.json`, {
        headers: {
          Authorization: `Basic ${btoa(`${keyCdnApiKey}:`)}`,
        },
      }),
      (error) =>
        new MonitoringError(`Failed to fetch zones from KeyCDN: ${error}`)
    )
      .map((response) => response.data.data.zonealiases)
      .andThen((data) => {
        if (!isKeyCdnResponse(data)) {
          return errAsync(
            new MonitoringError("Failed to parse response from KeyCDN")
          )
        }

        const domains = data
          .map((zone) => zone.name)
          .map((domain) => ({
            domain,
            type: IsomerHostedDomainType.KEYCDN,
          }))
        return okAsync(domains)
      })
  }

  getAmplifyDeployments() {
    return this.launchesService.getAllDomains().map((domains) =>
      domains.map((domain) => ({
        domain,
        type: IsomerHostedDomainType.AMPLIFY,
      }))
    )
  }

  /**
   * While most of our redirections are in our DB, we do have ad-hoc redirections.
   * @returns List of redirection domains that are listed in the isomer-redirection repository
   */
  getRedirectionDomains() {
    const SYSTEM_GITHUB_TOKEN = config.get("github.systemToken")
    // seems to be a bug in typing, this is a direct
    // copy paste from the octokit documentation
    // https://octokit.github.io/rest.js/v20#automatic-retries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OctokitRetry = Octokit.plugin(retry as any)
    const octokitWithRetry: Octokit = new OctokitRetry({
      auth: SYSTEM_GITHUB_TOKEN,
      request: { retries: 5 },
    })

    return ResultAsync.fromPromise(
      octokitWithRetry.request(
        "GET /repos/opengovsg/isomer-redirection/contents/src/certbot-websites.csv"
      ),
      (error) =>
        new MonitoringError(`Failed to fetch redirection domains: ${error}`)
    )
      .andThen((response) => {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        )

        return ResultAsync.fromPromise(
          promisifyPapaParse<RedirectionDomain[]>(content),
          (error) => new MonitoringError(`Failed to parse csv: ${error}`)
        )
      })
      .map((redirectionDomains) =>
        redirectionDomains
          .map((domain) => domain.source)
          .map((domain) => ({
            domain,
            type: IsomerHostedDomainType.REDIRECTION,
          }))
      )
  }

  /**
   * This is in charge of fetching all the domains that are are under Isomer, inclusive
   * of any subdomains and redirects.
   */
  getAllDomains() {
    this.monitoringServiceLogger.info("Fetching all domains")
    return ResultAsync.combine([
      this.getAmplifyDeployments().mapErr(
        (error) => new MonitoringError(error.message)
      ),
      this.getRedirectionDomains(),
      this.getKeyCdnDomains(),
    ]).andThen(([amplifyDeployments, redirectionDomains, keyCdnDomains]) => {
      this.monitoringServiceLogger.info("Fetched all domains")
      return okAsync(
        _.sortBy(
          [...amplifyDeployments, ...redirectionDomains, ...keyCdnDomains],
          (val) => (val.domain.startsWith("www.") ? val.domain.slice(4) : val)
        )
      )
    })
  }

  // todo: once /siteup logic is merged into dev, we can add that as to alert isomer team
  generateReportCard(domains: IsomerHostedDomain[]) {
    const reportCard: ReportCard[] = []

    const domainResolvers = domains.map(({ domain, type }) => {
      const aRecord = ResultAsync.fromPromise(
        dns.resolve(domain, "A"),
        (e) => e
      ).orElse(() => okAsync([]))
      const quadArecord = ResultAsync.fromPromise(
        dns.resolve(domain, "AAAA"),
        (e) => e
      ).orElse(() => okAsync([]))

      const cNameRecord = ResultAsync.fromPromise(
        dns.resolve(domain, "CNAME"),
        (e) => e
      ).orElse(() => okAsync([]))

      const caaRecord = ResultAsync.fromPromise(
        dns.resolve(domain, "CAA"),
        (e) => e
      )
        .orElse(() => okAsync([]))
        .map((records) => records.map((record) => record.toString()))

      return ResultAsync.combineWithAllErrors([
        aRecord,
        quadArecord,
        cNameRecord,
        caaRecord,
      ])
        .andThen((resolvedDns) =>
          okAsync<ReportCard>({
            domain,
            type,
            aRecord: resolvedDns[0],
            quadArecord: resolvedDns[1],
            cNameRecord: resolvedDns[2],
            caaRecord: resolvedDns[3],
          })
        )
        .map((value) =>
          reportCard.push({
            ...value,
          })
        )
        .andThen(() => okAsync(reportCard))
    })

    return ResultAsync.combineWithAllErrors(domainResolvers).map(
      () => reportCard
    )
  }

  driver() {
    this.monitoringServiceLogger.info("Monitoring service started")
    return this.getAllDomains()
      .andThen(this.generateReportCard)
      .andThen((reportCard) => {
        this.monitoringServiceLogger.info({
          message: "Report card generated",
          meta: {
            reportCard,
            date: new Date(),
          },
        })
        return okAsync(reportCard)
      })
  }
}
