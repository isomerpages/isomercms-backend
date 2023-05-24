import { ScanCommandOutput } from "@aws-sdk/lib-dynamodb"

import { SiteLaunchMessage } from "@root/../microservices/site-launch/shared/types"
import DynamoDBClient from "@services/infra/DynamoDBClient"
import DynamoDBService from "@services/infra/DynamoDBService"

jest.mock("@services/infra/DynamoDBClient")

const mockLaunch: SiteLaunchMessage = {
  repoName: "my-repo",
  appId: "my-app",
  primaryDomainSource: "example.com",
  primaryDomainTarget: "myapp.example.com",
  domainValidationSource: "example.com",
  domainValidationTarget: "myapp.example.com",
  requestorEmail: "john@example.com",
  agencyEmail: "agency@example.com",
  githubRedirectionUrl: "https://github.com/my-repo",
  redirectionDomain: [
    {
      source: "example.com",
      target: "myapp.example.com",
      type: "A",
    },
  ],
  status: { state: "pending", message: "PENDING_DURING_SITE_LAUNCH" },
}

const mockSuccessLaunch: SiteLaunchMessage = {
  ...mockLaunch,
  appId: "success-app-id",
  status: { state: "success", message: "SUCCESS_SITE_LIVE" },
}

const mockFailureLaunch: SiteLaunchMessage = {
  ...mockLaunch,
  appId: "failure-app-id",
  status: {
    state: "failure",
    message: "FAILURE_WRONG_CLOUDFRONT_DISTRIBUTION",
  },
}

const tableName = "site-launch"
const mockDynamoDBClient = {
  createItem: jest.fn(),
  getAllItems: jest.fn(),
  deleteItem: jest.fn(),
  withLogger: jest.fn(),
}

const dynamoDBClient = (mockDynamoDBClient as unknown) as DynamoDBClient
const dynamoDBService = new DynamoDBService({ dynamoDBClient })

const spyDynamoDBService = {
  deleteItem: jest.spyOn(dynamoDBService, "deleteItem"),
}
describe("DynamoDBService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe("createItem", () => {
    it("should call the createItem method of the DynamoDBClient with the correct arguments", async () => {
      await dynamoDBService.createItem(mockLaunch)
      expect(dynamoDBClient.createItem).toHaveBeenCalledWith(
        tableName,
        mockLaunch
      )
    })
  })

  describe("getAllSuccessOrFailureLaunches", () => {
    it("should call the getAllItems method of the DynamoDBClient with the correct arguments", async () => {
      const scanCommandOutput: ScanCommandOutput = {
        $metadata: { httpStatusCode: 200 },
        Items: [mockSuccessLaunch, mockLaunch, mockFailureLaunch],
      }
      mockDynamoDBClient.getAllItems.mockReturnValueOnce(scanCommandOutput)
      const result: SiteLaunchMessage[] = await dynamoDBService.getAllCompletedLaunches()
      expect(dynamoDBClient.getAllItems).toHaveBeenCalledWith(tableName)
      expect(spyDynamoDBService.deleteItem).toHaveBeenCalledWith(
        mockSuccessLaunch
      )
      expect(spyDynamoDBService.deleteItem).toHaveBeenCalledWith(
        mockFailureLaunch
      )
      expect(result).toEqual([mockSuccessLaunch, mockFailureLaunch])
    })
  })

  describe("deleteItem", () => {
    it("should call the deleteItem method of the DynamoDBClient with the correct arguments", async () => {
      await dynamoDBService.deleteItem(mockLaunch)
      expect(dynamoDBClient.deleteItem).toHaveBeenCalledWith(tableName, {
        appId: "my-app",
      })
      expect(dynamoDBClient.deleteItem).not.toThrow()
    })
  })
})
