/* eslint-disable import/prefer-default-export */ // todo remove this and use prefer-default-export

import { StepFunctions, Lambda } from "aws-sdk"

export const stepFunctionsTrigger = async (event: MessageBody) => {
  const { AWS_REGION, AWS_ACCOUNT_NUMBER, STATE_MACHINE_NAME } = process.env
  try {
    const stepFunctions = new StepFunctions()
    const stateMachineArn = `arn:aws:states:${AWS_REGION}:${AWS_ACCOUNT_NUMBER}:stateMachine:${STATE_MACHINE_NAME}`
    const params = {
      stateMachineArn,
      input: JSON.stringify(event),
    }

    const repsonse = await stepFunctions.startExecution(params).promise()

    if (repsonse.$response.error) {
      throw Error(`Failed to start state machine for ${event.repoName}`)
    }
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
      console.log(res, error)
    })
  }
}
