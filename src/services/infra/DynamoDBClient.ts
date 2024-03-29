import { DynamoDBClient, ScanCommandOutput } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  PutCommandOutput,
  DeleteCommandOutput,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb"
import autoBind from "auto-bind"

import config from "@root/config/config"
import logger from "@root/logger/logger"
import { SiteLaunchMessage } from "@root/types/siteLaunch"

export interface UpdateParams {
  TableName: string
  Key: Record<string, string>
  UpdateExpression: string
  ExpressionAttributeNames: Record<string, string>
  ExpressionAttributeValues: Record<string, string>
}
export default class DynamoDBDocClient {
  private readonly dynamoDBDocClient: DynamoDBDocumentClient

  constructor() {
    const marshallOptions = {
      // Whether to automatically convert empty strings, blobs, and sets to `null`.
      convertEmptyValues: false,
      // Whether to remove undefined values while marshalling.
      removeUndefinedValues: true,
      // Whether to convert typeof object to map attribute.
      convertClassInstanceToMap: false,
    }

    const unmarshallOptions = {
      // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
      wrapNumbers: false,
    }

    this.dynamoDBDocClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: config.get("aws.region") }),
      { marshallOptions, unmarshallOptions }
    )

    autoBind(this)
  }

  private withLogger = async <T>(
    promise: Promise<T>,
    type: "create" | "scan" | "delete" | "update"
  ): Promise<T> => {
    try {
      return await promise
    } catch (e) {
      logger.error(
        `Error in operation ${type} item for the dynamoDB table: ${e}`
      )
      throw e
    }
  }

  createItem = async (
    tableName: string,
    item: SiteLaunchMessage
  ): Promise<PutCommandOutput> => {
    const params = {
      TableName: tableName,
      Item: {
        PRIMARY_KEY: item.appId,
        ...item,
      },
    }

    return this.withLogger(
      this.dynamoDBDocClient.send(new PutCommand(params)),
      "create"
    )
  }

  getAllItems = async (tableName: string): Promise<ScanCommandOutput> => {
    const params = {
      TableName: tableName,
    }
    return this.withLogger(
      this.dynamoDBDocClient.send(new ScanCommand(params)),
      "scan"
    )
  }

  deleteItem = async (
    tableName: string,
    key: Record<string, string>
  ): Promise<DeleteCommandOutput> => {
    const params = {
      TableName: tableName,
      Key: key,
    }
    return this.withLogger(
      this.dynamoDBDocClient.send(new DeleteCommand(params)),
      "delete"
    )
  }
}
