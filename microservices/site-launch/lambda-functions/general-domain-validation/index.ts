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
  SITE_LAUNCH_LAMBDA_TYPE,
  SITE_LAUNCH_LAMBDA_STATUS,
} from "../../shared/types" // TODO: Change to aliased imports

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


interface GeneralDomainValidationLambdaResponse {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
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
    lambdaType: SITE_LAUNCH_LAMBDA_TYPE.GENERAL_DOMAIN_VALIDATION,
    status: SITE_LAUNCH_LAMBDA_STATUS.SUCCESS,
    appId,
    primaryDomain,
    message: event
  }
}
