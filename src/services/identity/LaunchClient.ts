import {
  AmplifyClient,
  CreateDomainAssociationCommand,
  CreateDomainAssociationCommandInput,
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
    repoName: string,
    primaryDomain: string,
    subDomainSettings: undefined
  ): CreateDomainAssociationCommandInput => ({
    appId: repoName,
    domainName: primaryDomain,
    subDomainSettings,
  })

  sendCreateDomainAssociation = (
    options: CreateDomainAssociationCommandInput
  ) => this.amplifyClient.send(new CreateDomainAssociationCommand(options))
}

export default LaunchClient
