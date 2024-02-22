import AWS from "aws-sdk"
import Bluebird from "bluebird"
import winston from "winston"
import WinstonCloudwatch from "winston-cloudwatch"

import { config } from "@config/config"

import { consoleLogger } from "./console.logger"
import { LogMethod, Loggable } from "./logger.types"

const { combine, timestamp } = winston.format

// AWS Configuration
const AWS_REGION_NAME = config.get("aws.region")
AWS.config.update({ region: AWS_REGION_NAME })
const awsMetadata = new AWS.MetadataService()
const metadataRequest = Bluebird.promisify<string, string>(
  awsMetadata.request.bind(awsMetadata)
)

const LOG_GROUP_NAME = `${process.env.AWS_BACKEND_EB_ENV_NAME}/nodejs.log`

async function getEc2InstanceId(): Promise<string> {
  try {
    return await metadataRequest("/latest/meta-data/instance-id").timeout(1000)
  } catch (error) {
    console.log(
      "Error getting EC2 instance ID. This script is probably not running on EC2"
    )
    throw error
  }
}

export default class CloudWatchLogger {
  _logger: winston.Logger

  constructor() {
    this._logger = winston.createLogger({
      level: "info",
      format: combine(
        timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        })
      ),
      transports: [
        // Console transport using the same single-line JSON format
        new winston.transports.Console({
          format: combine(
            timestamp({
              format: "YYYY-MM-DD HH:mm:ss",
            })
          ),
        }),
      ],
    })
    this.init()
  }

  async init() {
    const logGroupName = LOG_GROUP_NAME
    const logStreamName = await getEc2InstanceId()
    const awsRegion = AWS_REGION_NAME

    const cloudwatchConfig = {
      logGroupName,
      logStreamName,
      awsRegion,
      stderrLevels: ["error"],
      format: combine(
        timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        })
      ),
      handleExceptions: true,
    }

    this._logger.add(new WinstonCloudwatch(cloudwatchConfig))
  }

  info = (message: string | Record<string, unknown>) =>
    withConsoleError(this._logger.info)(message)

  warn = (message: string | Record<string, unknown>) =>
    withConsoleError(this._logger.warn)(message)

  error = (message: string | Record<string, unknown>) =>
    withConsoleError(this._logger.error)(message)
}

const withConsoleError = (logFn: LogMethod) => (message: Loggable): void => {
  try {
    logFn(message)
  } catch (err) {
    consoleLogger.error(`${err}`)
  }
}
