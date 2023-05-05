import {
  DeleteCommandOutput,
  GetCommandOutput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb"
import autoBind from "auto-bind"

import { config } from "@config/config"

import {
  SiteLaunchMessage,
  SiteLaunchLambdaStatus,
} from "@root/../microservices/site-launch/shared/types"

import DynamoDBClient, { UpdateParams } from "./DynamoDBClient"

const MOCK_LAUNCH: MessageBody = {
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
  status: SiteLaunchLambdaStatus.PENDING,
}
export default class DynamoDBService {
  private readonly dynamoDBClient: DynamoDBClient

  private readonly TABLE_NAME: string

  constructor() {
    this.dynamoDBClient = new DynamoDBClient()
    this.TABLE_NAME = config.get("aws.dynamodb.siteLaunchTableName")
    autoBind(this)
  }

  async createItem(message: MessageBody): Promise<void> {
    await this.dynamoDBClient.createItem(this.TABLE_NAME, MOCK_LAUNCH)
  }

  async getItem(message: MessageBody): Promise<GetCommandOutput> {
    return this.dynamoDBClient.getItem(this.TABLE_NAME, MOCK_LAUNCH.appId)
  }

  async updateItem(message: MessageBody): Promise<UpdateCommandOutput> {
    // TODO: delete mocking after integration in IS-186
    MOCK_LAUNCH.status = SiteLaunchLambdaStatus.SUCCESS
    const updateParams: UpdateParams = {
      TableName: this.TABLE_NAME,
      Key: { appId: MOCK_LAUNCH.appId },
      // The update expression to apply to the item,
      // in this case setting the "status" attribute to a value
      UpdateExpression: "set #status = :status",
      // A map of expression attribute names used in the update expression,
      // in this case mapping "#status" to the "status" attribute
      ExpressionAttributeNames: { "#status": "status" },
      // A map of expression attribute values used in the update expression,
      // in this case mapping ":status" to the value of the Launch status
      ExpressionAttributeValues: {
        ":status": MOCK_LAUNCH.status,
      },
    }
    return this.dynamoDBClient.updateItem(updateParams)
  }

  async deleteItem(message: MessageBody): Promise<DeleteCommandOutput> {
    return this.dynamoDBClient.deleteItem(this.TABLE_NAME, {
      appId: MOCK_LAUNCH.appId,
    })
  }
}
