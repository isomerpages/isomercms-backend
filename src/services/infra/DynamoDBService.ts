import { DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"
import autoBind from "auto-bind"

import { config } from "@config/config"

import { SiteLaunchMessage } from "@root/../microservices/site-launch/shared/types"

import DynamoDBClient from "./DynamoDBClient"

export default class DynamoDBService {
  private readonly dynamoDBClient: DynamoDBClient

  private readonly TABLE_NAME: string

  constructor(dynamoDBClient: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient
    this.TABLE_NAME = config.get("aws.dynamodb.siteLaunchTableName")
    autoBind(this)
  }

  async createItem(message: SiteLaunchMessage): Promise<void> {
    await this.dynamoDBClient.createItem(this.TABLE_NAME, message)
  }

  async getAllSuccessOrFailureLaunches(): Promise<SiteLaunchMessage[]> {
    const entries = ((await this.dynamoDBClient.getAllItems(this.TABLE_NAME))
      .Items as unknown) as SiteLaunchMessage[]

    const successEntries =
      entries?.filter(
        (entry) =>
          entry.status?.state === "success" || entry.status?.state === "failure"
      ) || []

    // Delete after retrieving the items
    Promise.all(successEntries.map((entry) => this.deleteItem(entry)))
    return successEntries
  }

  async deleteItem(message: SiteLaunchMessage): Promise<DeleteCommandOutput> {
    return this.dynamoDBClient.deleteItem(this.TABLE_NAME, {
      appId: message.appId,
    })
  }
}
