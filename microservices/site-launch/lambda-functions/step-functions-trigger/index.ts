/* eslint-disable import/prefer-default-export */ // todo remove this and use prefer-default-export

import { StepFunctions, Lambda } from "aws-sdk"

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
export const stepFunctionsTrigger = async (event: MessageBody) => {
  const {
    AWS_REGION,
    AWS_ACCOUNT_NUMBER,
    NODE_ENV,
    STATE_MACHINE_NAME,
  } = process.env
  const stepFunctionsParams =
    NODE_ENV === "LOCAL_DEV" ? { endpoint: "http://localhost:8003" } : {}

  try {
    const stepFunctions = new StepFunctions(stepFunctionsParams)
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
      console.log(res, error)
    })
  }
}
