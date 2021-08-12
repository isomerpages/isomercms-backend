const AWS = require("aws-sdk")
const { serializeError } = require("serialize-error")

const config = require("@config/config")

const logger = require("@logger/logger")

const { ConflictError } = require("@errors/ConflictError")

// Env vars
const MUTEX_ENABLED = config.get("mutex.enabled")
const MUTEX_TABLE_NAME = config.get("mutex.tableName")
const mockMutexObj = {}

// Dynamodb constants
const AWS_REGION_NAME = "ap-southeast-1"
AWS.config.update({ region: AWS_REGION_NAME })
const docClient = new AWS.DynamoDB.DocumentClient()

const mockLock = (siteName) => {
  if (mockMutexObj[siteName]) throw new Error("Mock lock error")
  mockMutexObj[siteName] = true
}

const mockUnlock = (siteName) => {
  mockMutexObj[siteName] = false
}

const lock = async (siteName) => {
  try {
    const ONE_MIN_FROM_CURR_DATE_IN_SECONDS_FROM_EPOCH_TIME =
      Math.floor(new Date().valueOf() / 1000) + 60

    if (MUTEX_ENABLED) {
      const params = {
        TableName: MUTEX_TABLE_NAME,
        Item: {
          repo_id: siteName,
          expdate: ONE_MIN_FROM_CURR_DATE_IN_SECONDS_FROM_EPOCH_TIME,
        },
        ConditionExpression: "attribute_not_exists(repo_id)",
      }
      await docClient.put(params).promise()
    } else {
      return mockLock(siteName)
    }

    return logger.info(`Successfully locked repo ${siteName}`)
  } catch (err) {
    logger.error(
      `Failed to lock repo ${siteName}: ${JSON.stringify(serializeError(err))}`
    )
    throw new ConflictError(
      `Someone else is currently modifying repo ${siteName}. Please try again later.`
    )
  }
}

const unlock = async (siteName) => {
  if (!MUTEX_ENABLED) return mockUnlock(siteName)

  try {
    const params = {
      TableName: MUTEX_TABLE_NAME,
      Key: {
        repo_id: siteName,
      },
    }
    await docClient.delete(params).promise()
    return logger.info(`Successfully unlocked repo ${siteName}`)
  } catch (err) {
    logger.error(
      `Failed to unlock repo ${siteName}: ${JSON.stringify(
        serializeError(err)
      )}`
    )
    throw new Error(`Something went wrong.`)
  }
}

module.exports = {
  lock,
  unlock,
}
