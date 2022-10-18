import type { APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export const failureNotification = async (event: {
  Error: string
  Cause: string
}): Promise<APIGatewayProxyResult> => {
  const { Cause } = event

  // const sqs = new SQS()
  const sqs = new SQS({ region: AWS_REGION })
  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL || "",
    MessageBody: Cause,
  }

  sqs.sendMessage(messageParams, (err, data) => {
    if (err) {
      console.log("Error", err)
    } else {
      console.log("Success", data.MessageId)
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Sent failure message",
      },
      null,
      2
    ),
  }
}
