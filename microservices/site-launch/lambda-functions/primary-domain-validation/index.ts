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

interface PrimaryDomainValidationLambdaParams {
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
}

interface PrimaryDomainValidationLambdaResponse {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
  appId: string
  primaryDomain: string
}

export const primaryDomainValidation = async (
  event: PrimaryDomainValidationLambdaParams
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

    // Check if the primary DNS record was set correctly. This is necessary because Amplify doesn't actually check if the
    // primary domain record has been pointed correctly.
    const cnameRecords = await dns.promises.resolveCname(primaryDomainSource)
    if (!cnameRecords.includes(cloudfrontDomain)) {
      throw new Error(
        `Website administrator has not set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
      )
    }

    console.log(
      `Website administrator has successfully set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
    )
    return {
      lambdaType: SITE_LAUNCH_LAMBDA_TYPE.PRIMARY_DOMAIN_VALIDATION,
      status: SITE_LAUNCH_LAMBDA_STATUS.SUCCESS,
      appId,
      primaryDomain: primaryDomainSource,
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}
