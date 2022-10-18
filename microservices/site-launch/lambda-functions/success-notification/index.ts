import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import logger from "../../shared/logger"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export const successNotification = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info(JSON.stringify(event))

  const sqs = new SQS({ region: AWS_REGION })
  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL || "",
    MessageBody: JSON.stringify(event),
  }

  sqs.sendMessage(messageParams, (err, data) => {
    if (err) {
      logger.log("Error", err)
    } else {
      logger.log("Success", data.MessageId)
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Sent success message",
      },
      null,
      2
    ),
  }
}
