import dns from "dns/promises"

import { Octokit } from "@octokit/rest"
import autoBind from "auto-bind"
import { errAsync, okAsync, ResultAsync } from "neverthrow"
import Papa from "papaparse"

import parentLogger from "@logger/logger"

import config from "@root/config/config"
import MonitoringError from "@root/errors/MonitoringError"
import LaunchesService from "@root/services/identity/LaunchesService"

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

type keyCdnZoneAlias = {
  name: string
}

interface KeyCdnResponse {
  data: {
    zonealiases: keyCdnZoneAlias[]
  }
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

function isKeyCdnZoneAlias(object: unknown): object is keyCdnZoneAlias {
  return "name" in (object as keyCdnZoneAlias)
}

function isKeyCdnResponse(object: unknown): object is KeyCdnResponse {
  return "data" in (object as KeyCdnResponse)
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
      fetch(`https://api.keycdn.com/zonealiases.json`, {
        headers: {
          Authorization: `Basic ${btoa(`${keyCdnApiKey}:`)}`,
        },
      }),
      (error) => new MonitoringError(`Failed to fetch zones: ${error}`)
    )
      .andThen((response) => {
        if (!response.ok) {
          return errAsync(
            new MonitoringError(
              `Failed to retrieve zones: ${response.statusText}`
            )
          )
        }
        return okAsync(response)
      })
      .andThen((response) =>
        ResultAsync.fromPromise(
          response.json(),
          (error) => new MonitoringError(`Failed to parse response: ${error}`)
        )
      )
      .andThen((data: unknown) => {
        if (!isKeyCdnResponse(data)) {
          return errAsync(new MonitoringError("Failed to parse response"))
        }

        const domains = data.data.zonealiases
          .filter(isKeyCdnZoneAlias)
          .map((zone: keyCdnZoneAlias) => zone.name)
          .map(
            (domain) =>
              ({
                domain,
                type: IsomerHostedDomainType.KEYCDN,
              } as IsomerHostedDomain)
          )

        return okAsync(domains)
      })
  }

  getAmplifyDeployments() {
    return this.launchesService.getAllDomains().map((domains) =>
      domains.map(
        (domain) =>
          ({
            domain,
            type: IsomerHostedDomainType.AMPLIFY,
          } as IsomerHostedDomain)
      )
    )
  }

  /**
   * While most of our redirections are in our DB, we do have ad-hoc redirections.
   * @returns List of redirection domains that are listed in the isomer-redirection repository
   */
  getRedirectionDomains() {
    const SYSTEM_GITHUB_TOKEN = config.get("github.systemToken")
    const OctokitRetry = Octokit.plugin()
    const octokitWithRetry = new OctokitRetry({
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
          new Promise<RedirectionDomain[]>((resolve, reject) => {
            Papa.parse(content, {
              header: true,
              complete(results) {
                // validate the csv
                if (!results.data) {
                  reject(new MonitoringError("Failed to parse csv"))
                }
                resolve(results.data as RedirectionDomain[])
              },
              error(error: unknown) {
                reject(error)
              },
            })
          }),
          (error) => new MonitoringError(`Failed to parse csv: ${error}`)
        )
      })
      .map((redirectionDomains) =>
        redirectionDomains
          .map((domain) => domain.source)
          .map(
            (domain) =>
              ({
                domain,
                type: IsomerHostedDomainType.REDIRECTION,
              } as IsomerHostedDomain)
          )
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
        [...amplifyDeployments, ...redirectionDomains, ...keyCdnDomains].sort(
          (a, b) => {
            const domainA = a.domain
            const domainB = b.domain
            if (
              domainA.startsWith("www.") &&
              domainA.slice(`www.`.length) === domainB
            ) {
              return 0
            }
            if (
              domainB.startsWith("www.") &&
              domainA === domainB.slice(`www.`.length)
            ) {
              return 0
            }
            if (domainA === domainB) return 0
            return domainA > domainB ? 1 : -1
          }
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

    return ResultAsync.combineWithAllErrors(domainResolvers)
      .andThen(() => {
        this.monitoringServiceLogger.info({
          message: "Report card generated",
          meta: {
            reportCard,
            date: new Date(),
          },
        })
        return okAsync(reportCard)
      })
      .orElse(() => okAsync([]))
  }

  driver() {
    this.monitoringServiceLogger.info("Monitoring service started")
    return this.getAllDomains().andThen(this.generateReportCard)
  }
}
