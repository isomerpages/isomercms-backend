/* eslint-disable import/prefer-default-export */ // todo remove this and use prefer-default-export

import { MessageBody } from "@root/services/identity/QueueService"
import AWS, { Lambda } from "aws-sdk"

import logger from "../../shared/logger"

export const stepFunctionsTrigger = async (event: MessageBody) => {
  const { AWS_REGION, AWS_ACCOUNT_NUMBER, NODE_ENV } = process.env
  try {
    const stepFunctions = new AWS.StepFunctions({
      endpoint: NODE_ENV ?? "http://localhost:8083",
    })

    const stateMachineArn = `arn:aws:states:${AWS_REGION}:${AWS_ACCOUNT_NUMBER}:stateMachine:siteLaunch`

    const params = {
      stateMachineArn,
      input: JSON.stringify(event),
    }

    stepFunctions.startExecution(params, (res, err) => {
      if (err) {
        logger.error(err)
        throw err
      }
      logger.info(`Your state machine ${stateMachineArn} executed successfully`)
    })
  } catch (err) {
    const lambda = new AWS.Lambda({
      region: AWS_REGION,
      endpoint:
        NODE_ENV === "LOCAL_DEV"
          ? "http://localhost:3002"
          : `https://lambda.${AWS_REGION}.amazonaws.com`,
    })
    const params: Lambda.Types.InvocationRequest = {
      FunctionName: `isomercms-dev-failureNotification`,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(event),
    }
    lambda.invoke(params, (res, error) => {
      if (res) logger.info(res)
      else logger.error(error)
    })
  }
}
