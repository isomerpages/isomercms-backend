import { StepFunctions } from "aws-sdk"

import config from "@root/config/config"

import { SiteLaunchMessage } from "../../../microservices/site-launch/shared/types"

export default class StepFunctionsService {
  private client: StepFunctions

  private stateMachineArn: string

  constructor(stepFunctions: StepFunctions) {
    stepFunctions.config.update({ region: config.get("aws.region") })
    this.client = stepFunctions
    this.stateMachineArn = config.get("aws.stepFunctions.stepFunctionsArn")
  }

  async triggerFlow(
    message: SiteLaunchMessage
  ): Promise<StepFunctions.StartExecutionOutput> {
    const params: StepFunctions.StartExecutionInput = {
      stateMachineArn: this.stateMachineArn,
      input: JSON.stringify(message),
    }
    const response = await this.client.startExecution(params).promise()
    return response
  }
}
