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

import {
  MessageBody,
  SITE_LAUNCH_LAMBDA_STATUS,
  SITE_LAUNCH_LAMBDA_TYPE,
} from "../../shared/types"

interface PrimaryDomainValidationLambdaParams {
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
}

interface PrimaryDomainValidationLambdaResponse {
  lambdaType: SITE_LAUNCH_LAMBDA_TYPE
  status: SITE_LAUNCH_LAMBDA_STATUS
  message: MessageBody
}

export const primaryDomainValidation = async (
  event: MessageBody
): Promise<PrimaryDomainValidationLambdaResponse> => {
  console.log(event)

  const AWS_REGION_NAME = "ap-southeast-1"
  const amplifyClient = new AmplifyClient({
    region: AWS_REGION_NAME,
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
    const cnameRecords = await promises.resolveCname(
      "kishoretest.isomer.gov.sg"
    )
    console.log(cnameRecords)
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
      message: event,
    }
  } catch (error) {
    console.error(error)
    throw new Error(JSON.stringify({ ...event, success: false }))
  }
}
