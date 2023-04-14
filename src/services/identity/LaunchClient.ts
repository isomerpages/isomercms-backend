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
import { SubDomain } from "aws-sdk/clients/amplify"

import { config } from "@config/config"

// create a new interface that extends GetDomainAssociationCommandInput
interface MockGetDomainAssociationCommandInput
  extends GetDomainAssociationCommandInput {
  subDomainSettings: SubDomainSetting[]
}

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
  ): Promise<CreateDomainAssociationCommandOutput> => {
    if (this.shouldMockAmplifyCreateDomainCalls()) {
      return this.mockCreateDomainAssociationOutput(input)
    }
    const output = this.amplifyClient.send(
      new CreateDomainAssociationCommand(input)
    )
    return output
  }

  createGetDomainAssociationCommandInput = (
    appId: string,
    domainName: string,
    subDomainSettings: SubDomainSetting[]
  ):
    | GetDomainAssociationCommandInput
    | MockGetDomainAssociationCommandInput => ({
    appId,
    domainName,
    ...(this.shouldMockAmplifyCreateDomainCalls() && { subDomainSettings }),
  })

  sendGetDomainAssociationCommand = (
    input:
      | GetDomainAssociationCommandInput
      | MockGetDomainAssociationCommandInput
  ): Promise<GetDomainAssociationCommandOutput> => {
    const isMockInput = "subDomainSettings" in input
    if (isMockInput) {
      // handle mock input
      return this.mockGetDomainAssociationOutput(input)
    }
    return this.amplifyClient.send(new GetDomainAssociationCommand(input))
  }

  /**
   * The rate limit for Create Domain Association is 10 per hour.
   * We want to limit interference with operations, as such we mock this call during development.
   * @returns Mocked output for CreateDomainAssociationCommand
   */
  mockCreateDomainAssociationOutput = (
    input: CreateDomainAssociationCommandInput
  ): Promise<CreateDomainAssociationCommandOutput> => {
    const mockResponse: CreateDomainAssociationCommandOutput = {
      $metadata: {
        httpStatusCode: 200,
      },
      domainAssociation: {
        autoSubDomainCreationPatterns: [],
        autoSubDomainIAMRole: undefined,
        certificateVerificationDNSRecord: undefined,
        domainAssociationArn: `arn:aws:amplify:ap-southeast-1:11111:apps/${input.appId}/domains/${input.domainName}`,
        domainName: input.domainName,
        domainStatus: "CREATING",
        enableAutoSubDomain: false,
        statusReason: undefined,
        subDomains: undefined,
      },
    }

    const subDomainSettingsList = input.subDomainSettings
    if (!subDomainSettingsList || subDomainSettingsList.length === 0) {
      return Promise.resolve(mockResponse)
    }

    const subDomains: SubDomain[] = this.getSubDomains(subDomainSettingsList)

    // We know that domainAssociation is not undefined, so we can use the non-null assertion operator
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    mockResponse.domainAssociation!.subDomains = subDomains
    return Promise.resolve(mockResponse)
  }

  private shouldMockAmplifyCreateDomainCalls(): boolean {
    return config.get("aws.amplify.mockAmplifyCreateDomainAssociationCalls")
  }

  private getSubDomains(
    subDomainList: SubDomainSetting[],
    hasCreated = false
  ): SubDomain[] {
    const subDomainPrefixList = subDomainList
      .map((subDomain) => subDomain.prefix)
      .filter((prefix) => prefix !== undefined) as string[]

    const subDomains: SubDomain[] = []
    subDomainPrefixList.forEach((subDomainPrefix) => {
      subDomains.push({
        dnsRecord: `${subDomainPrefix} CNAME ${
          hasCreated ? "test.cloudfront.net" : "<pending>"
        }`,
        subDomainSetting: {
          branchName: "master",
          prefix: subDomainPrefix,
        },
        verified: false,
      })
    })
    return subDomains
  }

  mockGetDomainAssociationOutput(
    input: MockGetDomainAssociationCommandInput
  ): Promise<GetDomainAssociationCommandOutput> {
    const mockResponse: GetDomainAssociationCommandOutput = {
      $metadata: {
        httpStatusCode: 200,
      },
      domainAssociation: {
        certificateVerificationDNSRecord: `testcert.${input.domainName}. CNAME testcert.acm-validations.aws.`,
        domainAssociationArn: `arn:aws:amplify:ap-southeast-1:11111:apps/${input.appId}/domains/${input.domainName}`,
        domainName: input.domainName,
        domainStatus: "PENDING_VERIFICATION",
        enableAutoSubDomain: false,
        subDomains: undefined,
        statusReason: undefined,
      },
    }
    const isCreated = true // this is a get call, assume domain has already been created
    const subDomains = this.getSubDomains(input.subDomainSettings, isCreated)

    // We know that domainAssociation is not undefined, so we can use the non-null assertion operator
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    mockResponse.domainAssociation!.subDomains = subDomains

    return Promise.resolve(mockResponse)
  }
}

export default LaunchClient
