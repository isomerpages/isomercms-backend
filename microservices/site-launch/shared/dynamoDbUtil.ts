import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import { SiteLaunchMessage } from "./types"

export const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false,
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true,
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false,
}

export const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false,
}

export function getDynamoDBClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions,
    unmarshallOptions,
  })
}

export function getUpdateParams({
  tableName,
  siteLaunchMessage,
}: {
  tableName: string
  siteLaunchMessage: SiteLaunchMessage
}) {
  return {
    TableName: tableName,
    Key: { appId: siteLaunchMessage.appId },
    UpdateExpression:
      "set #status.#state = :state, #status.#message = :message",
    ExpressionAttributeNames: {
      "#status": "status",
      "#state": "state",
      "#message": "message",
    },
    ExpressionAttributeValues: {
      ":state": siteLaunchMessage.status,
      ":message": siteLaunchMessage.status.message,
    },
  }
}
