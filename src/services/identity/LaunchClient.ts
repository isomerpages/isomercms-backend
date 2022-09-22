import {
  AmplifyClient,
  CreateDomainAssociationCommand,
  CreateDomainAssociationCommandInput,
} from "@aws-sdk/client-amplify"
import { ResultAsync } from "neverthrow"

import { AmplifyError } from "@root/types/index"

const { AWS_REGION } = process.env

const wrap = (promise: Promise<unknown>) =>
  ResultAsync.fromPromise(
    promise,
    (e) => new AmplifyError(`Publish to Amplify failed: ${e}`)
  )

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
  ) =>
    wrap(
      this.amplifyClient.send(new CreateDomainAssociationCommand(options))
    ) as ResultAsync<CreateDomainAssociationCommandInput, AmplifyError>
}

export default LaunchClient
