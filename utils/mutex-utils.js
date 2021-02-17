const AWS = require('aws-sdk');
const { serializeError } = require('serialize-error')

const logger = require('../logger/logger')
const { GetMutexError, ReleaseMutexError } = require('../errors/MutexError')

// Env vars
const { NODE_ENV, MUTEX_TABLE_NAME } = process.env
const IS_LOCAL_DEV = NODE_ENV === 'LOCAL_DEV'
const mockMutexObj = {}

// Dynamodb constants
const AWS_REGION_NAME = 'ap-southeast-1'
AWS.config.update({region: AWS_REGION_NAME})
const docClient = new AWS.DynamoDB.DocumentClient();

const mockLock = (siteName) => {
  if (mockMutexObj[siteName]) throw new Error('Mock lock error')
  mockMutexObj[siteName] = true
}

const mockUnlock = (siteName) => {
  mockMutexObj[siteName] = false
}

const lock = async (siteName) => {
  try {
    if (!IS_LOCAL_DEV) {
      const params = {
        TableName: MUTEX_TABLE_NAME,
        Item: {
          repo_id: siteName
        },
        ConditionExpression: "attribute_not_exists(repo_id)"
      }
      await docClient.put(params).promise()  
    } else {
      return mockLock(siteName)
    }

    return logger.info(`Successfully locked repo ${siteName}`)
  } catch (err) {
    logger.error(`Failed to lock repo ${siteName}: ${JSON.stringify(serializeError(err))}`)
    throw new GetMutexError(`Someone else is currently modifying repo ${siteName}. Please try again later.`)
  }
}

const unlock = async (siteName) => {
  if (IS_LOCAL_DEV) return mockUnlock(siteName)

  try {
    const params = {
      TableName: MUTEX_TABLE_NAME,
      Key: {
        repo_id: siteName
      }
    }
    await docClient.delete(params).promise()
    return logger.info(`Successfully unlocked repo ${siteName}`)
  } catch (err) {
    logger.error(`Failed to unlock repo ${siteName}: ${JSON.stringify(serializeError(err))}`)
    throw new ReleaseMutexError(`Something went wrong.`)
  }
}

module.exports = {
  lock,
  unlock
}