/* eslint-disable import/prefer-default-export */
import type { APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

import { MessageBody } from "../../shared/types"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export const failureNotification = async (event: {
  Error: string
  Cause: string
}): Promise<APIGatewayProxyResult> => {
  const { Cause } = event
  const sqs = new SQS({ region: AWS_REGION })

  /**
   * the shape of the cause is as such:
   * '{"errorMessage":"{"repoName":"kishoretest","appId":"d302ik027bbbsq","primaryDomainSource":"kishoretest.isomer.gov.sg","primaryDomainTarget":"blah.cloudfront.net","domainValidationSource":"blah.kishoretest.isomer.gov.sg","domainValidationTarget":"blah.acm.aws","success":false}","errorType":"Error",
   * "trace":["Error: {"repoName":"kishoretest","appId":"d302ik027bbbsq","primaryDomainSource":"kishoretest.isomer.gov.sg","primaryDomainTarget":"blah.cloudfront.net","domainValidationSource":"blah.kishoretest.isomer.gov.sg","domainValidationTarget":"blah.acm.aws","success":false}","
   * at primaryDomainValidation
   * at processTicksAndRejections
   * at async MessagePort.<anonymous>"]}'
   *
   * To extract out the relevant messageBody, parse the message and get out the errorMessage
   */
  const messageBody: MessageBody = JSON.parse(JSON.parse(Cause).errorMessage)
  messageBody.success = false
  messageBody.siteLaunchError = Cause

  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL || "",
    MessageBody: JSON.stringify(messageBody),
  }

  console.log("Message params:", JSON.stringify(messageParams))

  const result = await sqs.sendMessage(messageParams).promise()

  console.log("SQS Message sent:", result)

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
