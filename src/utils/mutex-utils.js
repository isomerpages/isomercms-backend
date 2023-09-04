const AWS = require("aws-sdk")
const { serializeError } = require("serialize-error")

const { config } = require("@config/config")

const logger = require("@logger/logger").default

const LockedError = require("@root/errors/LockedError").default

// Env vars
const NODE_ENV = config.get("env")
const MUTEX_TABLE_NAME = config.get("mutexTableName")

const IS_DEV = NODE_ENV === "dev" || NODE_ENV === "test" || NODE_ENV === "vapt"
const E2E_TEST_REPOS = ["e2e-email-test-repo", "e2e-test-repo"]
const mockMutexObj = {}

// Dynamodb constants
const AWS_REGION_NAME = config.get("aws.region")
AWS.config.update({ region: AWS_REGION_NAME })
const docClient = new AWS.DynamoDB.DocumentClient()

const isE2eTestRepo = (siteName) => E2E_TEST_REPOS.includes(siteName)

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

    if (isE2eTestRepo(siteName)) return
    if (!IS_DEV) {
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
    throw new LockedError(
      `Someone else is currently modifying repo ${siteName}. Please try again later.`
    )
  }
}

const unlock = async (siteName) => {
  if (isE2eTestRepo(siteName)) return
  if (IS_DEV) return mockUnlock(siteName)

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
