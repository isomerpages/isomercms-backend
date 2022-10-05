import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"

export const hithere = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(event)
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message:
          "Hithere. Go Serverless v3.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  }
}
