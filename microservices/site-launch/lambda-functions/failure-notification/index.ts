import type { APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import logger from "../../shared/logger"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export const failureNotification = async (event: {
  Error: string
  Cause: string
}): Promise<APIGatewayProxyResult> => {
  const { Cause } = event

  const sqs = new SQS({ region: AWS_REGION })
  if (!INCOMING_QUEUE_URL) {
    const errMessage = "Incoming queue URL is not set"
    logger.error(errMessage)
    throw new Error(errMessage)
  }
  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL,
    MessageBody: Cause,
  }

  sqs.sendMessage(messageParams, (err, data) => {
    if (err) {
      logger.error("Error", err)
    } else {
      logger.log("Success", data.MessageId)
    }
  })

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
