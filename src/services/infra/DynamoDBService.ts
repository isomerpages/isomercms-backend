import { DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"
import autoBind from "auto-bind"
import { ResultAsync, errAsync, okAsync } from "neverthrow"

import { config } from "@config/config"

import {
  SiteLaunchMessage,
  isSiteLaunchMessage,
} from "@root/../microservices/site-launch/shared/types"
import DatabaseError from "@root/errors/DatabaseError"
import MissingSiteError from "@root/errors/MissingSiteError"
import createErrorAndLog from "@root/utils/error-utils"

import DynamoDBClient from "./DynamoDBClient"

export default class DynamoDBService {
  private readonly dynamoDBClient: DynamoDBClient

  private readonly TABLE_NAME: string

  constructor({
    dynamoDBClient,
    dynamoDbTableName = config.get("aws.dynamodb.siteLaunchTableName"),
  }: {
    dynamoDBClient: DynamoDBClient
    dynamoDbTableName?: string
  }) {
    this.dynamoDBClient = dynamoDBClient
    this.TABLE_NAME = dynamoDbTableName
    autoBind(this)
  }

  async createItem(message: SiteLaunchMessage): Promise<void> {
    await this.dynamoDBClient.createItem(this.TABLE_NAME, message)
  }

  async getAllLaunches(): Promise<SiteLaunchMessage[]> {
    const entries = ((
      await this.dynamoDBClient.getAllItems(this.TABLE_NAME)
    ).Items?.filter(isSiteLaunchMessage) as unknown) as SiteLaunchMessage[]
    return entries
  }

  getLaunchStatus(
    repoName: string
  ): ResultAsync<
    "success" | "failure" | "pending",
    DatabaseError | MissingSiteError
  > {
    return ResultAsync.fromPromise(this.getAllLaunches(), (error) =>
      createErrorAndLog(
        DatabaseError,
        `Something went wrong when querying DynamoDB: ${error}`
      )
    ).andThen((entries) => {
      const entry = entries.find((e) => e.repoName === repoName)
      if (entry) return okAsync(entry.status?.state ?? "pending")
      return errAsync(
        createErrorAndLog(
          MissingSiteError,
          `No site found for ${repoName} in DynamoDB`
        )
      )
    })
  }

  async getAllCompletedLaunches(): Promise<SiteLaunchMessage[]> {
    const entries = await this.getAllLaunches()

    const completedEntries =
      entries?.filter(
        (entry) =>
          entry.status?.state === "success" || entry.status?.state === "failure"
      ) || []

    // Delete after retrieving the items
    Promise.all(completedEntries.map((entry) => this.deleteItem(entry)))
    return completedEntries
  }

  async deleteItem(message: SiteLaunchMessage): Promise<DeleteCommandOutput> {
    return this.dynamoDBClient.deleteItem(this.TABLE_NAME, {
      appId: message.appId,
    })
  }
}
