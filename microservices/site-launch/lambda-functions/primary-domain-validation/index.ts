/* eslint-disable import/prefer-default-export */
import { promises } from "dns"

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

interface PrimaryDomainValidationLambdaResponse {
  lambdaType: SiteLaunchLambdaType
  status: SiteLaunchLambdaStatus
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
    logger.info(
      `Amplify app with id ${appId} and domain ${primaryDomainSource} successfully completed primary domain validation step with status ${domainAssociationStatus}`
    )

    // Check if the primary DNS record was set correctly. This is necessary because Amplify doesn't actually check if the
    // primary domain record has been pointed correctly.
    const cnameRecords = await promises.resolveCname(primaryDomainSource)
    logger.info(cnameRecords)
    if (!cnameRecords.includes(cloudfrontDomain)) {
      throw new Error(
        `Website administrator has not set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
      )
    }

    logger.info(
      `Website administrator has successfully set up the primary domain ${primaryDomainSource} to point to the correct Cloudfront domain name`
    )
    return {
      lambdaType: SiteLaunchLambdaType.PRIMARY_DOMAIN_VALIDATION,
      status: SiteLaunchLambdaStatus.SUCCESS_SITE_LIVE,
      message: event,
    }
  } catch (error) {
    logger.error(error)
    throw error
  }
}
