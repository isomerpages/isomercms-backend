import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"

export const hithere = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => ({
  statusCode: 200,
  body: JSON.stringify(
    {
      message:
        "Hi there! Go Serverless v3.0! Your function executed successfully!",
      input: event,
    },
    null,
    2
  ),
})
