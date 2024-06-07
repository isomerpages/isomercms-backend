import { retry } from "@octokit/plugin-retry"
import { Octokit } from "@octokit/rest"
import autoBind from "auto-bind"
import axios from "axios"
import { Job, Queue, Worker } from "bullmq"
import _ from "lodash"
import { errAsync, okAsync, ResultAsync } from "neverthrow"

import parentLogger from "@logger/logger"
import logger from "@logger/logger"

import config from "@root/config/config"
import MonitoringError from "@root/errors/MonitoringError"
import { gb } from "@root/middleware/featureFlag"
import LaunchesService from "@root/services/identity/LaunchesService"
import { dnsMonitor } from "@root/utils/dns-utils"
import { isMonitoringEnabled } from "@root/utils/growthbook-utils"
import convertNeverThrowToPromise from "@root/utils/neverthrow"
import promisifyPapaParse from "@root/utils/papa-parse"

interface MonitoringServiceProps {
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

function isKeyCdnZoneAlias(object: unknown): object is KeyCdnZoneAlias {
  return "name" in (object as KeyCdnZoneAlias)
}

function isKeyCdnResponse(object: unknown): object is KeyCdnZoneAlias[] {
  if (!object) return false
  if (Array.isArray(object)) return object.every(isKeyCdnZoneAlias)
  return false
}
const ONE_MINUTE = 60000
export default class MonitoringService {
  private readonly launchesService: MonitoringServiceProps["launchesService"]

  private readonly monitoringServiceLogger = parentLogger.child({
    module: "monitoringService",
  })

  private readonly REDIS_CONNECTION = {
    host: config.get("bullmq.redisHostname"),
    port: 6379,
  }

  private readonly queue = new Queue("MonitoringQueue", {
    connection: {
      ...this.REDIS_CONNECTION,
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: ONE_MINUTE, // this operation is not critical, so we can wait a minute
      },
    },
  })

  private readonly worker: Worker<unknown, string, string>

  constructor({ launchesService }: MonitoringServiceProps) {
    autoBind(this)
    const jobName = "dnsMonitoring"
    this.launchesService = launchesService

    const FIVE_MINUTE_CRON = "5 * * * *"

    const jobData = {
      name: "monitoring sites",
    }

    ResultAsync.fromPromise(
      this.queue.add(jobName, jobData, {
        repeat: {
          pattern: FIVE_MINUTE_CRON,
        },
      }),
      (e) => e
    )
      .map((okRes) => {
        this.monitoringServiceLogger.info(
          `Monitoring job scheduled at interval ${FIVE_MINUTE_CRON}`
        )
        return okRes
      })
      .mapErr((errRes) => {
        this.monitoringServiceLogger.error(`Failed to schedule job: ${errRes}`)
      })

    this.worker = new Worker(
      this.queue.name,
      async (job: Job) => {
        this.monitoringServiceLogger.info(`Monitoring Worker ${job.id}`)
        if (job.name === jobName) {
          // The retry's work on a thrown error, so we need to convert the neverthrow to a promise
          const res = await convertNeverThrowToPromise(this.driver())
          return res
        }
        throw new MonitoringError("Invalid job name")
      },
      {
        connection: {
          ...this.REDIS_CONNECTION,
        },
        lockDuration: 60000, // 1 minute, since this is a relatively expensive operation
      }
    )

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error({
        message: "Monitoring service has failed",
        error,
        meta: {
          ...job?.data,
        },
      })
    })
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
    const OctokitRetry = Octokit.plugin(retry)
    const octokitWithRetry: Octokit = new OctokitRetry({
      auth: SYSTEM_GITHUB_TOKEN,
      request: { retries: 5 },
    })

    return ResultAsync.fromPromise(
      octokitWithRetry.request(
        "GET /repos/opengovsg/isomer-redirection/contents/src/certbot-websites.csv"
      ),
      (err) =>
        new MonitoringError(`Failed to fetch redirection domains: ${err}`)
    )
      .andThen((response) => {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        )

        return ResultAsync.fromPromise(
          promisifyPapaParse<RedirectionDomain[]>(content),
          (err) => new MonitoringError(`Failed to parse csv: ${err}`)
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
        (err) => new MonitoringError(err.message)
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

  generateReportCard(domains: IsomerHostedDomain[]) {
    const dnsPromises: ResultAsync<string, string>[] = []

    domains.forEach((domain) => dnsPromises.push(dnsMonitor(domain.domain)))
    return ResultAsync.combineWithAllErrors(dnsPromises)
  }

  driver() {
    if (!isMonitoringEnabled(gb)) return okAsync("Monitoring Service disabled")
    const start = Date.now()
    this.monitoringServiceLogger.info("Monitoring service started")

    return this.getAllDomains()
      .andThen(this.generateReportCard)
      .mapErr((reportCardErr: MonitoringError | string[]) => {
        if (reportCardErr instanceof MonitoringError) {
          this.monitoringServiceLogger.error({
            error: reportCardErr,
            message: "Error running monitoring service",
          })
          return
        }
        this.monitoringServiceLogger.error({
          message: "Error running monitoring service",
          meta: {
            dnsCheckerResult: reportCardErr,
            date: new Date(),
          },
        })
      })
      .orElse(() => okAsync([]))
      .andThen(() => {
        this.monitoringServiceLogger.info(
          `Monitoring service completed in ${Date.now() - start}ms`
        )
        return okAsync("Monitoring service completed")
      })
  }
}
