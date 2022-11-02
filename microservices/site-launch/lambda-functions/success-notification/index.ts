/* eslint-disable import/prefer-default-export */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import logger from "../../shared/logger"
import {
  MessageBody,
  SITE_LAUNCH_LAMBDA_STATUS,
  SITE_LAUNCH_LAMBDA_TYPE,
} from "../../shared/types"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env
export interface inputParams {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
  message: MessageBody
}

export const successNotification = async (
  event: inputParams[]
): Promise<APIGatewayProxyResult> => {
  logger.info(JSON.stringify(event))

  /**
   * In success, all three lambdas will be return a success.
   * Therefore, to get the message shape, we can just take the message body from one lambda.
   */

  const messageBody = event[0].message

  const sqs = new SQS({ region: AWS_REGION })
  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL || "",
    MessageBody: JSON.stringify({ ...messageBody, success: true }),
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
