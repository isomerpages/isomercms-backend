/* eslint-disable import/prefer-default-export */
import { UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import { getDynamoDBClient, getUpdateParams } from "../../shared/dynamoDbUtil"
import logger from "../../shared/logger"
import {
  SiteLaunchMessage,
  SiteLaunchStatus,
  SiteLaunchLambdaType,
} from "../../shared/types"

const {
  INCOMING_QUEUE_URL,
  AWS_REGION,
  FF_DEPRECATE_SITE_QUEUES,
  SITE_LAUNCH_DYNAMO_DB_TABLE_NAME,
} = process.env
export interface InputParams {
  lambdaType: SiteLaunchLambdaType
  status: SiteLaunchStatus
  message: SiteLaunchMessage
}

export const successNotification = async (
  event: InputParams[]
): Promise<APIGatewayProxyResult> => {
  console.log("input", { event })
  logger.info(JSON.stringify(event))

  /**
   * In success, all three lambdas will be return a success.
   * Therefore, to get the message shape, we can just take the message body from one lambda.
   */

  const messageBody: SiteLaunchMessage = event[0].message
  messageBody.status = {
    state: "success",
    message: "SUCCESS_PROPAGATING",
  }

  if (FF_DEPRECATE_SITE_QUEUES) {
    const dynamoDBDocClient = getDynamoDBClient(AWS_REGION)

    const updateParams = getUpdateParams({
      tableName: SITE_LAUNCH_DYNAMO_DB_TABLE_NAME || "",
      siteLaunchMessage: messageBody,
    })

    dynamoDBDocClient.send(new UpdateCommand(updateParams))
  } else {
    const sqs = new SQS({ region: AWS_REGION })
    const messageParams = {
      QueueUrl: INCOMING_QUEUE_URL || "",
      MessageBody: JSON.stringify(messageBody),
    }

    sqs.sendMessage(messageParams, (err, data) => {
      if (err) {
        logger.log("Error", err)
      } else {
        logger.log("Success", data.MessageId)
      }
    })
  }
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
