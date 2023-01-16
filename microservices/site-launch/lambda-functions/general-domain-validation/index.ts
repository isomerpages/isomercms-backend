import {
  AmplifyClient,
  GetDomainAssociationCommand,
  DomainStatus,
} from "@aws-sdk/client-amplify"
import type {
  GetDomainAssociationCommandInput,
  GetDomainAssociationCommandOutput,
} from "@aws-sdk/client-amplify"

import logger from "../../shared/logger"
import {
  MessageBody,
  SiteLaunchLambdaStatus,
  SiteLaunchLambdaType,
} from "../../shared/types"

interface GeneralDomainValidationLambdaResponse {
  lambdaType: SiteLaunchLambdaType
  status: SiteLaunchLambdaStatus
  appId: string
  primaryDomain: string
  message: MessageBody
}

const SUCCESSFUL_GENERAL_DOMAIN_VALIDATION_STATUSES = [
  DomainStatus.AVAILABLE,
  DomainStatus.PENDING_DEPLOYMENT,
]

export const generalDomainValidation = async (
  event: MessageBody
): Promise<GeneralDomainValidationLambdaResponse> => {
  logger.info(event)

  const { AWS_REGION } = process.env
  const amplifyClient = new AmplifyClient({
    region: AWS_REGION,
  })

  // Validation check
  const { appId, primaryDomainSource: primaryDomain } = event

  if (!appId) throw new Error(`appId was undefined`)
  if (!primaryDomain) throw new Error(`primaryDomain was undefined`)

  const params: GetDomainAssociationCommandInput = {
    appId,
    domainName: primaryDomain,
  }
  const getDomainAssociationCommand = new GetDomainAssociationCommand(params)

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
  logger.info(
    `Amplify app with id ${appId} and domain ${primaryDomain} successfully completed general domain validation step with status ${domainAssociationStatus}`
  )

  return {
    lambdaType: SiteLaunchLambdaType.GENERAL_DOMAIN_VALIDATION,
    status: SiteLaunchLambdaStatus.SUCCESS,
    appId,
    primaryDomain,
    message: event,
  }
}
