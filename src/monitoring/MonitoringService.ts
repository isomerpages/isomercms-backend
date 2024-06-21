import autoBind from "auto-bind"
import { Job, Queue, Worker } from "bullmq"
import _ from "lodash"
import { ResultAsync } from "neverthrow"

import parentLogger from "@logger/logger"
import logger from "@logger/logger"

import config from "@root/config/config"
import MonitoringError from "@root/errors/MonitoringError"
import convertNeverThrowToPromise from "@root/utils/neverthrow"

import MonitoringWorker from "./MonitoringWorker"

const ONE_MINUTE = 60000
interface MonitoringServiceInterface {
  monitoringWorker: MonitoringWorker
}

export default class MonitoringService {
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

  private readonly worker: Worker<
    {
      name: string
    },
    string,
    string
  >

  private readonly monitoringWorker: MonitoringServiceInterface["monitoringWorker"]

  constructor({ monitoringWorker }: MonitoringServiceInterface) {
    this.monitoringWorker = monitoringWorker
    autoBind(this)
    const jobName = "dnsMonitoring"

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
          const res = await convertNeverThrowToPromise(
            this.monitoringWorker.driver()
          )
          return res
        }
        throw new MonitoringError("Invalid job name")
      },
      {
        connection: {
          ...this.REDIS_CONNECTION,
        },
        lockDuration: ONE_MINUTE, // since this is a relatively expensive operation
      }
    )

    this.worker.on("error", (error: Error) => {
      logger.error({
        message: "Monitoring service has errored",
        error,
      })
    })
    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error({
        message: "Monitoring service has errored",
        error,
        meta: {
          ...job?.data,
        },
      })
    })
  }
}
