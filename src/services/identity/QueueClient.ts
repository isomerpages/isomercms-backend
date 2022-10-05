import AWS, { SQS } from "aws-sdk"

import logger from "@root/logger/logger"

export default class QueueClient {
  private readonly sqs: AWS.SQS

  private readonly incomingQueueUrl =
    "http://localhost:4566/000000000000/incomingQueue"

  private readonly outgoingQueueUrl =
    "http://localhost:4566/000000000000/outgoingQueue"

  constructor() {
    this.sqs = new AWS.SQS()
  }

  sendMessage = async (MessageBody: string) => {
    const queueResestParams: SQS.Types.SendMessageRequest = {
      QueueUrl: this.outgoingQueueUrl,
      MessageBody,
    }
    this.sqs.sendMessage(queueResestParams, (err, data) => {
      if (err) {
        logger.error(err)
      } else {
        logger.info(data)
      }
    })
  }

  receiveMessage = async () => {
    logger.info(`checking queue`)
    const params: SQS.ReceiveMessageRequest = {
      // todo remove hardcoded url
      QueueUrl: this.incomingQueueUrl,
      AttributeNames: ["All"],
      VisibilityTimeout: 0,
      WaitTimeSeconds: 10,
      // todo figure out why queue returns the same message 10 times rather than 10 different messages
      // MaxNumberOfMessages:10
    }
    return this.sqs.receiveMessage(params, (err, data) => {
      if (err) {
        console.log(err, err.stack)
        throw err
      } else {
        console.log("successful retrival of queue")
        console.log(data)
        if (data.Messages) {
          this.deleteMessage(data)
        }
        return data
      }
    })
  }

  createDeleteMessageParams = (
    receiptHandle: string
  ): SQS.DeleteMessageRequest => ({
    QueueUrl: this.incomingQueueUrl,
    ReceiptHandle: receiptHandle,
  })

  deleteMessage = async (data: SQS.ReceiveMessageResult) => {
    logger.info(`deleting message ${data}`)
    const receiptHandles = data?.Messages?.map(
      (message) => message.ReceiptHandle
    )
    if (receiptHandles) {
      receiptHandles?.forEach((receiptHandle) => {
        try {
          if (receiptHandle) {
            this.sqs.deleteMessage(
              this.createDeleteMessageParams(receiptHandle),
              (err) => {
                if (err) {
                  logger.error(err, err.stack)
                  throw err
                }
              }
            )
          }
        } catch (err) {
          logger.error(`error trying to delete message handle ${receiptHandle}`)
        }
      })
    }
  }
}
