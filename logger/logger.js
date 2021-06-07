// Imports
const Bluebird = require("bluebird")
const moment = require("moment-timezone")

// Env vars
const { NODE_ENV } = process.env

// AWS
const AWS = require("aws-sdk")

const AWS_REGION_NAME = "ap-southeast-1"
AWS.config.update({ region: AWS_REGION_NAME })
const awsMetadata = new AWS.MetadataService()
const metadataRequest = Bluebird.promisify(
  awsMetadata.request.bind(awsMetadata)
)

// Logging tools
const winston = require("winston")
const WinstonCloudWatch = require("winston-cloudwatch")

// Constants
const LOG_GROUP_NAME = `${process.env.AWS_BACKEND_EB_ENV_NAME}/nodejs.log`
const IS_PROD_ENV = NODE_ENV !== "LOCAL_DEV" && NODE_ENV !== "DEV"

// Retrieve EC2 instance since that is the cloudwatch log stream name
async function getEc2InstanceId() {
  let id
  try {
    id = await metadataRequest("/latest/meta-data/instance-id").timeout(1000)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(
      timestampGenerator(),
      "Error getting ec2 instance id. This script is probably not running on ec2"
    )
    throw error
  }
  return id
}

function timestampGenerator() {
  return moment().tz("Asia/Singapore").format("YYYY-MM-DD HH:mm:ss")
}
class CloudWatchLogger {
  constructor() {
    this._logger = winston.createLogger()
  }

  async init() {
    if (IS_PROD_ENV) {
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

        this._logger.add(new WinstonCloudWatch(cloudwatchConfig))
      } catch (err) {
        console.error(`${timestampGenerator()} ${err.message}`)
        console.error(
          `${timestampGenerator()} Failed to initiate CloudWatch logger`
        )
      }
    }
  }

  // this method is used to log non-error messages, replacing console.log
  async info(logMessage) {
    // eslint-disable-next-line no-console
    console.log(`${timestampGenerator()} ${logMessage}`)

    if (IS_PROD_ENV) {
      try {
        await this._logger.info(`${timestampGenerator()} ${logMessage}`)
      } catch (err) {
        console.error(`${timestampGenerator()} ${err.message}`)
      }
    }
  }

  // this method is used to log error messages and write to stderr, replacing console.error
  async error(errMessage) {
    console.error(`${timestampGenerator()} ${errMessage}`)

    if (IS_PROD_ENV) {
      try {
        await this._logger.error(`${timestampGenerator()} ${errMessage}`)
      } catch (err) {
        console.error(`${timestampGenerator()} ${err.message}`)
      }
    }
  }
}

const logger = new CloudWatchLogger()

module.exports = logger
