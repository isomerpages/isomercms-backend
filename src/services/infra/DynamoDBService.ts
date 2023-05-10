import autoBind from "auto-bind"

import { config } from "@config/config"

import {
  MessageBody,
  SiteLaunchLambdaStatus,
} from "@root/../microservices/site-launch/shared/types"

import DynamoDBClient, { UpdateParams } from "./DynamoDBClient"

export default class DynamoDBService {
  private readonly dynamoDBClient: DynamoDBClient

  private readonly TABLE_NAME: string

  // todo: delete these mock after integration in IS-186
  private mockLaunch: MessageBody = {
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

  constructor() {
    this.dynamoDBClient = new DynamoDBClient()
    this.TABLE_NAME = config.get("aws.dynamodb.siteLaunchTableName")
    autoBind(this)
  }

  async createItem(message: MessageBody): Promise<void> {
    await this.dynamoDBClient.createItem(this.TABLE_NAME, this.mockLaunch)
  }

  async getItem(message: MessageBody) {
    return this.dynamoDBClient.getItem(this.TABLE_NAME, this.mockLaunch.appId)
  }

  async updateItem(message: MessageBody) {
    // todo: delete mocking after integration
    this.mockLaunch.status = SiteLaunchLambdaStatus.SUCCESS
    const updateParams: UpdateParams = {
      TableName: this.TABLE_NAME,
      Key: { appId: this.mockLaunch.appId },
      UpdateExpression: "set #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": this.mockLaunch.status,
      },
    }
    return this.dynamoDBClient.updateItem(updateParams)
  }

  async deleteItem(message: MessageBody) {
    return this.dynamoDBClient.deleteItem(this.TABLE_NAME, {
      appId: this.mockLaunch.appId || "",
    })
  }
}
