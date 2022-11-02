/* eslint-disable import/prefer-default-export */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import logger from "../../shared/logger"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export enum SITE_LAUNCH_LAMBDA_STATUS {
  SUCCESS = "success",
  FAILURE = "failure",
}

export enum SITE_LAUNCH_LAMBDA_TYPE {
  GENERAL_DOMAIN_VALIDATION = "general-domain-validation",
  PRIMARY_DOMAIN_VALIDATION = "primary-domain-validation",
  REDIRECTION_DOMAIN_VALIDATION = "redirection-domain-validation",
}

export interface MessageBody {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  requestorEmail: string
  agencyEmail: string
  githubRedirectionUrl?: string
  redirectionDomain?: [
    {
      source: string
      target: string
      type: string
    }
  ]
  success?: boolean
  siteLaunchError?: string
}
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
