import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { SQS } from "aws-sdk"

const { INCOMING_QUEUE_URL, AWS_REGION } = process.env

export const successNotification = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event)

  const sqs = new SQS({ region: AWS_REGION })
  const messageParams = {
    QueueUrl: INCOMING_QUEUE_URL || "",
    MessageBody: JSON.stringify({ ...event, success: true }),
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
        message: "Sent success message",
      },
      null,
      2
    ),
  }
}
