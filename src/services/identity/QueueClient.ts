import AWS, { SQS } from "aws-sdk"

import logger from "@root/logger/logger"

export default class QueueClient {
  private readonly sqs: AWS.SQS

  constructor() {
    this.sqs = new AWS.SQS()
  }

  sendMessage = async ({
    QueueUrl,
    MessageBody,
  }: SQS.Types.SendMessageRequest) => {
    const params = { QueueUrl, MessageBody }
    this.sqs.sendMessage(params, (err, data) => {
      if (err) {
        logger.error(err)
      } else {
        logger.info(data)
      }
    })
  }

  receiveMessage = async () => {
    const params: SQS.ReceiveMessageRequest = {
      QueueUrl: "",
      AttributeNames: ["All"],
    }
    this.sqs.receiveMessage(params, (err, data) => {
      if (err) console.log(err, err.stack)
      // an error occurred
      else console.log(data) // successful response
    })
  }
}
