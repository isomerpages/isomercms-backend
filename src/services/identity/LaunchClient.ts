import {
  AmplifyClient,
  CreateDomainAssociationCommand,
  CreateDomainAssociationCommandInput,
  CreateDomainAssociationCommandOutput,
  GetDomainAssociationCommand,
  GetDomainAssociationCommandInput,
  GetDomainAssociationCommandOutput,
  SubDomainSetting,
} from "@aws-sdk/client-amplify"

import logger from "@root/logger/logger"

import logger from "@root/logger/logger"

class LaunchClient {
  private readonly amplifyClient: InstanceType<typeof AmplifyClient>

  constructor() {
    const AWS_REGION = "ap-southeast-1"
    this.amplifyClient = new AmplifyClient({
      region: AWS_REGION,
    })
  }

  createDomainAssociationCommandInput = (
    appId: string,
    primaryDomain: string,
    subDomainSettings: SubDomainSetting[]
  ): CreateDomainAssociationCommandInput => ({
    appId,
    domainName: primaryDomain,
    subDomainSettings,
  })

  sendCreateDomainAssociation = (
    input: CreateDomainAssociationCommandInput
  ): Promise<CreateDomainAssociationCommandOutput> =>
    this.amplifyClient.send(new CreateDomainAssociationCommand(input))

  createGetDomainAssociationCommandInput = (
    appId: string,
    domainName: string
  ): GetDomainAssociationCommandInput => ({
    appId,
    domainName,
  })

  sendGetDomainAssociationCommand = (
    input: GetDomainAssociationCommandInput
  ): Promise<GetDomainAssociationCommandOutput> =>
    this.amplifyClient.send(new GetDomainAssociationCommand(input))
}

export default LaunchClient
