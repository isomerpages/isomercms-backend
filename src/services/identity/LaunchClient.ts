import {
  AmplifyClient,
  CreateDomainAssociationCommand,
  CreateDomainAssociationCommandInput as AmplifySDKCreateDomainAssociationCommandInput,
  CreateDomainAssociationCommandOutput,
  GetDomainAssociationCommand,
  GetDomainAssociationCommandInput as AmplifySDKGetDomainAssociationCommandInput,
  GetDomainAssociationCommandOutput,
  SubDomainSetting,
  DeleteDomainAssociationCommandInput as AmplifySDKDeleteDomainAssociationCommandInput,
  DeleteDomainAssociationCommand,
  NotFoundException,
} from "@aws-sdk/client-amplify"
import { SubDomain } from "aws-sdk/clients/amplify"

import { config } from "@config/config"

import { AmplifyError } from "@root/types"

// stricter typing to interact with Amplify SDK
type CreateDomainAssociationCommandInput = {
  [K in keyof AmplifySDKCreateDomainAssociationCommandInput]: NonNullable<
    AmplifySDKCreateDomainAssociationCommandInput[K]
  >
}

type GetDomainAssociationCommandInput = {
  [K in keyof AmplifySDKGetDomainAssociationCommandInput]: NonNullable<
    AmplifySDKGetDomainAssociationCommandInput[K]
  >
}

type DeleteDomainAssociationCommandInput = {
  [K in keyof AmplifySDKDeleteDomainAssociationCommandInput]: NonNullable<
    AmplifySDKDeleteDomainAssociationCommandInput[K]
  >
}

export type AmplifyDomainNotFoundException = AmplifyError | NotFoundException

export const isAmplifyDomainNotFoundException = (
  obj: unknown
): obj is AmplifyDomainNotFoundException =>
  obj instanceof AmplifyError || obj instanceof NotFoundException

class LaunchClient {
  private readonly amplifyClient: InstanceType<typeof AmplifyClient>

  private readonly mockDomainAssociations: Map<string, SubDomainSetting[]>

  constructor() {
    const AWS_REGION = config.get("aws.region")
    this.amplifyClient = new AmplifyClient({
      region: AWS_REGION,
    })
    this.mockDomainAssociations = new Map()
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
    if (this.shouldMockAmplifyDomainCalls()) {
      return this.mockCreateDomainAssociationOutput(input)
    }
    const output = this.amplifyClient.send(
      new CreateDomainAssociationCommand(input)
    )
    return output
  }

  createGetDomainAssociationCommandInput = (
    appId: string,
    domainName: string
  ): GetDomainAssociationCommandInput => ({
    appId,
    domainName,
  })

  createDeleteDomainAssociationCommandInput = (
    appId: string,
    domainName: string
  ): DeleteDomainAssociationCommandInput => ({
    appId,
    domainName,
  })

  sendGetDomainAssociationCommand = (
    input: GetDomainAssociationCommandInput
  ): Promise<GetDomainAssociationCommandOutput> => {
    if (this.shouldMockAmplifyDomainCalls()) {
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
  private mockCreateDomainAssociationOutput = (
    input: CreateDomainAssociationCommandInput
  ): Promise<CreateDomainAssociationCommandOutput> => {
    // We are mocking the response from the Amplify API, so we need to store the input
    this.mockDomainAssociations.set(input.domainName, input.subDomainSettings)
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

  private shouldMockAmplifyDomainCalls(): boolean {
    return config.get("aws.amplify.mockAmplifyDomainAssociationCalls")
  }

  private getSubDomains(
    subDomainList: SubDomainSetting[],
    isCreated = false
  ): SubDomain[] {
    const subDomains = subDomainList
      .map((subDomain) => subDomain.prefix)
      .filter((prefix) => prefix !== undefined && prefix !== null)
      .map((subDomainPrefix) => ({
        dnsRecord: `${subDomainPrefix} CNAME ${
          isCreated ? "test.cloudfront.net" : "<pending>"
        }`,
        subDomainSetting: {
          branchName: "master",
          prefix: subDomainPrefix as string,
        },
        verified: false,
      }))
    return subDomains
  }

  async sendDeleteDomainAssociationCommand(
    input: DeleteDomainAssociationCommandInput
  ): Promise<void> {
    if (this.shouldMockAmplifyDomainCalls()) {
      this.mockDeleteDomainAssociationOutput(input)
    }
    await this.amplifyClient.send(new DeleteDomainAssociationCommand(input))
  }

  mockDeleteDomainAssociationOutput(
    input: DeleteDomainAssociationCommandInput
  ) {
    if (!this.mockDomainAssociations.has(input.domainName)) {
      throw new AmplifyError(
        `NotFoundException: Domain association ${input.domainName} not found.`
      )
    }
    this.mockDomainAssociations.delete(input.domainName)
  }

  private mockGetDomainAssociationOutput(
    input: GetDomainAssociationCommandInput
  ): Promise<GetDomainAssociationCommandOutput> {
    const isSubDomainCreated = true // this is a `get` call, assume domain has already been created
    const subDomainSettings = this.mockDomainAssociations.get(input.domainName)
    if (!subDomainSettings) {
      throw new AmplifyError(
        `NotFoundException: Domain association ${input.domainName} not found.`
      )
    }
    const subDomains = this.getSubDomains(subDomainSettings, isSubDomainCreated)

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
        subDomains,
        statusReason: undefined,
      },
    }

    return Promise.resolve(mockResponse)
  }
}

export default LaunchClient
