import AWS, { SQS } from "aws-sdk"

import logger from "@root/logger/logger"

const { INCOMING_QUEUE_URL, OUTGOING_QUEUE_URL } = process.env
export default class QueueClient {
  private readonly sqs: AWS.SQS

  private readonly incomingQueueUrl

  private readonly outgoingQueueUrl

  constructor() {
    this.sqs = new AWS.SQS()
    if (!INCOMING_QUEUE_URL || !OUTGOING_QUEUE_URL) {
      throw Error(`Queue URLs are not configured in environment variable`)
    }
    this.incomingQueueUrl = INCOMING_QUEUE_URL
    this.outgoingQueueUrl = OUTGOING_QUEUE_URL
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
      QueueUrl: this.incomingQueueUrl,
      AttributeNames: ["All"],
      VisibilityTimeout: 0,
      WaitTimeSeconds: 10,
    }
    const response = this.sqs.receiveMessage(params, (err, data) => {
      if (err) {
        logger.error(err)
        throw err
      }

      if (data.Messages) {
        this.deleteMessage(data)
      }

      return data
    })
    return response
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
                  logger.error(err)
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
