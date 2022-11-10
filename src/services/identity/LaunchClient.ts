import {
  AmplifyClient,
  CreateDomainAssociationCommand,
  CreateDomainAssociationCommandInput,
  GetDomainAssociationCommand,
  GetDomainAssociationCommandInput,
  SubDomainSetting,
} from "@aws-sdk/client-amplify"

const { AWS_REGION } = process.env

class LaunchClient {
  private readonly amplifyClient: InstanceType<typeof AmplifyClient>

  constructor() {
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

  sendCreateDomainAssociation = (input: CreateDomainAssociationCommandInput) =>
    this.amplifyClient.send(new CreateDomainAssociationCommand(input))

  createGetDomainAssociationCommandInput = (
    appId: string,
    domainName: string
  ): GetDomainAssociationCommandInput => ({
    appId,
    domainName,
  })

  sendGetDomainAssociationCommand = (input: GetDomainAssociationCommandInput) =>
    this.amplifyClient.send(new GetDomainAssociationCommand(input))
}

export default LaunchClient
