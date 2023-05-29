import AWS from "aws-sdk"
import Bluebird from "bluebird"
import winston from "winston"
import WinstonCloudwatch from "winston-cloudwatch"

import { consoleLogger } from "./console.logger"

// AWS
const AWS_REGION_NAME = "ap-southeast-1"
AWS.config.update({ region: AWS_REGION_NAME })
const awsMetadata = new AWS.MetadataService()
const metadataRequest = Bluebird.promisify<string, string>(
  awsMetadata.request.bind(awsMetadata)
)

// Constants
// TODO: Check this env var as it is not in example
const LOG_GROUP_NAME = `${process.env.AWS_BACKEND_EB_ENV_NAME}/nodejs.log`

// Retrieve EC2 instance since that is the cloudwatch log stream name
async function getEc2InstanceId(): Promise<string> {
  let id: string
  try {
    id = await metadataRequest("/latest/meta-data/instance-id").timeout(1000)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(
      "Error getting ec2 instance id. This script is probably not running on ec2"
    )
    throw error
  }
  return id
}

export default class CloudWatchLogger {
  _logger: winston.Logger

  constructor() {
    this._logger = winston.createLogger()
    this.init()
  }

  async init() {
    try {
      // attempt to log directly to cloudwatch
      const logGroupName = LOG_GROUP_NAME
      const logStreamName = await getEc2InstanceId()
      const awsRegion = AWS_REGION_NAME

      const cloudwatchConfig = {
        logGroupName,
        logStreamName,
        awsRegion,
        stderrLevels: ["error"],
        format: winston.format.simple(),
        handleExceptions: true,
      }

      this._logger.add(new WinstonCloudwatch(cloudwatchConfig))
    } catch (err) {
      consoleLogger.error(`${err}`)
      consoleLogger.error(`Failed to initiate CloudWatch logger`)
    }
  }

  // this method is used to log non-error messages, replacing console.log
  async info(logMessage: string) {
    try {
      await this._logger.info(`${logMessage}`)
    } catch (err) {
      consoleLogger.error(`${err}`)
    }
  }

  warn = async (message: string) => {
    try {
      await this._logger.warn(`${message}`)
    } catch (err) {
      consoleLogger.error(`${err}`)
    }
  }

  // this method is used to log error messages and write to stderr, replacing console.error
  async error(errMessage: string) {
    try {
      await this._logger.error(`${errMessage}`)
    } catch (err) {
      consoleLogger.error(`${err}`)
    }
  }
}

export const cloudwatchLogger = new CloudWatchLogger()
