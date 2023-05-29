/* eslint-disable import/prefer-default-export */
import { UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import { getDynamoDBClient, getUpdateParams } from "../../shared/dynamoDbUtil"
import logger from "../../shared/logger"
import { SiteLaunchMessage } from "../../shared/types"

const {
  INCOMING_QUEUE_URL,
  AWS_REGION,
  FF_DEPRECATE_SITE_QUEUES,
  SITE_LAUNCH_DYNAMO_DB_TABLE_NAME,
} = process.env

export const failureNotification = async (event: {
  error: string
  message: SiteLaunchMessage
}): Promise<APIGatewayProxyResult> => {
  const { message } = event
  console.log("input", { message })
  message.status = {
    state: "failure",
    message: "FAILURE_UNKNOWN_ERROR", // todo implement a more descriptive error message
  }
  message.statusMetadata = event.error
  if (FF_DEPRECATE_SITE_QUEUES) {
    const dynamoDBDocClient = getDynamoDBClient(AWS_REGION)

    const updateParams = getUpdateParams({
      tableName: SITE_LAUNCH_DYNAMO_DB_TABLE_NAME || "",
      siteLaunchMessage: message,
    })

    dynamoDBDocClient.send(new UpdateCommand(updateParams))
  } else {
    const sqs = new SQS({ region: AWS_REGION })
    if (!INCOMING_QUEUE_URL) {
      const errMessage = "Incoming queue URL is not set"
      logger.error(errMessage)
      throw new Error(errMessage)
    }
    const messageParams = {
      QueueUrl: INCOMING_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    }

    sqs.sendMessage(messageParams, (err, data) => {
      if (err) {
        logger.error("Error", err)
      } else {
        logger.log("Success", data.MessageId)
      }
    })
  }
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Sent failure message",
      },
      null,
      2
    ),
  }
}
