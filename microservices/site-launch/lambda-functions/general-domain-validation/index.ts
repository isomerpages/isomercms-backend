import {
  AmplifyClient,
  GetDomainAssociationCommand,
  DomainStatus,
} from "@aws-sdk/client-amplify"
import type {
  GetDomainAssociationCommandInput,
  GetDomainAssociationCommandOutput,
} from "@aws-sdk/client-amplify"

import {
  MessageBody,
  SITE_LAUNCH_LAMBDA_STATUS,
  SITE_LAUNCH_LAMBDA_TYPE,
} from "../../shared/types"

interface GeneralDomainValidationLambdaParams {
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
}

interface GeneralDomainValidationLambdaResponse {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
  message: MessageBody
}

const SUCCESSFUL_GENERAL_DOMAIN_VALIDATION_STATUSES = [
  DomainStatus.AVAILABLE,
  DomainStatus.PENDING_DEPLOYMENT,
]

export const generalDomainValidation = async (
  event: MessageBody
): Promise<GeneralDomainValidationLambdaResponse> => {
  console.log(event)

  const AWS_REGION_NAME = "ap-southeast-1"
  const amplifyClient = new AmplifyClient({
    region: AWS_REGION_NAME,
  })

  // Validation check
  const { appId, primaryDomainSource: primaryDomain } = event

  const params: GetDomainAssociationCommandInput = {
    appId,
    domainName: primaryDomain,
  }
  const getDomainAssociationCommand = new GetDomainAssociationCommand(params)

  try {
    const data: GetDomainAssociationCommandOutput = await amplifyClient.send(
      getDomainAssociationCommand
    )
    const domainAssociationStatus = data.domainAssociation?.domainStatus
    if (
      !domainAssociationStatus ||
      !SUCCESSFUL_GENERAL_DOMAIN_VALIDATION_STATUSES.includes(
        (domainAssociationStatus as unknown) as DomainStatus
      )
    ) {
      throw new Error(
        `Amplify app with id ${appId} and domain ${primaryDomain} has not completed general domain validation step. Current status: ${domainAssociationStatus}`
      )
    }
    console.log(
      `Amplify app with id ${appId} and domain ${primaryDomain} successfully completed general domain validation step with status ${domainAssociationStatus}`
    )

    return {
      lambdaType: SITE_LAUNCH_LAMBDA_TYPE.GENERAL_DOMAIN_VALIDATION,
      status: SITE_LAUNCH_LAMBDA_STATUS.SUCCESS,
      message: event,
    }
  } catch (error) {
    console.error(error)
    throw new Error(JSON.stringify({ ...event, success: false }))
  }
}
