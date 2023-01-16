/* eslint-disable import/prefer-default-export */ // todo remove this and use prefer-default-export

import AWS, { Lambda, StepFunctions } from "aws-sdk"

import logger from "../../shared/logger"
import { MessageBody } from "../../shared/types"

export const stepFunctionsTrigger = async (event: MessageBody) => {
  const { AWS_REGION, AWS_ACCOUNT_NUMBER, STATE_MACHINE_NAME } = process.env
  try {
    const stepFunctions = new StepFunctions()
    const stateMachineArn = `arn:aws:states:${AWS_REGION}:${AWS_ACCOUNT_NUMBER}:stateMachine:${STATE_MACHINE_NAME}`
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
    const lambda = new Lambda({
      region: AWS_REGION,
      endpoint: `https://lambda.${AWS_REGION}.amazonaws.com`,
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
