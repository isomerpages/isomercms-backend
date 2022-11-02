import dns from "dns"

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

interface PrimaryDomainValidationLambdaResponse {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
  message: MessageBody
}

export const primaryDomainValidation = async (
  event: MessageBody
): Promise<PrimaryDomainValidationLambdaResponse> => {
  logger.info(event)

  const { AWS_REGION } = process.env
  const amplifyClient = new AmplifyClient({
    region: AWS_REGION,
  })

  // Validation check
  const {
    appId,
    primaryDomainSource,
    primaryDomainTarget: cloudfrontDomain,
  } = event

  const params: GetDomainAssociationCommandInput = {
    appId,
    domainName: primaryDomainSource,
  }
  const getDomainAssociationCommand = new GetDomainAssociationCommand(params)

  try {
    const data: GetDomainAssociationCommandOutput = await amplifyClient.send(
      getDomainAssociationCommand
    )

    // Check if the general domain validation was done correctly
    const domainAssociationStatus = data.domainAssociation?.domainStatus
    if (domainAssociationStatus !== DomainStatus.AVAILABLE) {
      throw new Error(
        `Amplify app with id ${appId} and domain ${primaryDomainSource} has not completed primary domain validation step.  Current status: ${domainAssociationStatus}`
      )
    }
    console.log(
      `Amplify app with id ${appId} and domain ${primaryDomainSource} successfully completed primary domain validation step with status ${domainAssociationStatus}`
    )

    // todo figure out how to load 'dns' module and then uncomment the codes below
    // // Check if the primary DNS record was set correctly. This is necessary because Amplify doesn't actually check if the
    // // primary domain record has been pointed correctly.
    // const cnameRecords = await dns.promises.resolveCname(primaryDomainSource)
    // if (!cnameRecords.includes(cloudfrontDomain)) {
    //   throw new Error(
    //     `Website administrator has not set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
    //   )
    // }

    // console.log(
    //   `Website administrator has successfully set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
    // )
    return {
      lambdaType: SITE_LAUNCH_LAMBDA_TYPE.PRIMARY_DOMAIN_VALIDATION,
      status: SITE_LAUNCH_LAMBDA_STATUS.SUCCESS,
      message: event,
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}
