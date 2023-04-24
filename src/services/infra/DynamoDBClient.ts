/* eslint-disable consistent-return */ // todo remove this
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb"
import autoBind from "auto-bind"

import { MessageBody } from "@root/../microservices/site-launch/shared/types"
import logger from "@root/logger/logger"

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
      new DynamoDBClient({ region: "ap-southeast-1" }),
      { marshallOptions, unmarshallOptions }
    )

    autoBind(this)
  }

  createItem = async (tableName: string, item: MessageBody) => {
    const params = {
      TableName: tableName,
      Item: {
        PRIMARY_KEY: item.appId,
        ...item,
      },
    }
    try {
      return await this.dynamoDBDocClient.send(new PutCommand(params))
    } catch (error) {
      logger.error(`Error in createItem for the table ${tableName}: ${error}`)
    }
  }

  getItem = async (tableName: string, key: string) => {
    const params = {
      TableName: tableName,
      Key: { appId: key },
    }

    try {
      const result = await this.dynamoDBDocClient.send(new GetCommand(params))
      return result.Item
    } catch (err) {
      logger.error(`Error in getItem for the table ${tableName}: ${err}`)
    }
  }

  updateItem = async ({
    TableName,
    Key,
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  }: UpdateParams) => {
    try {
      const params: UpdateCommandInput = {
        TableName,
        Key,
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      }
      const result = await this.dynamoDBDocClient.send(
        new UpdateCommand(params)
      )
      return result
    } catch (error) {
      logger.error(`Error in updateItem for the table ${TableName}: ${error}`)
    }
  }

  deleteItem = async (tableName: string, key: Record<string, string>) => {
    const params = {
      TableName: tableName,
      Key: key,
    }
    try {
      return await this.dynamoDBDocClient.send(new DeleteCommand(params))
    } catch (error) {
      logger.error(`Error in deleteItem for the table ${tableName}: ${error}`)
    }
  }
}
