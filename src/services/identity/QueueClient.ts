import AWS, { SQS } from "aws-sdk"

import logger from "@root/logger/logger"

const { INCOMING_QUEUE_URL, OUTGOING_QUEUE_URL } = process.env
export default class QueueClient {
  private readonly sqs: AWS.SQS

  private readonly incomingQueueUrl: string

  private readonly outgoingQueueUrl: string

  constructor() {
    this.sqs = new AWS.SQS()
    if (!INCOMING_QUEUE_URL || !OUTGOING_QUEUE_URL) {
      throw Error(`Queue URLs are not configured in environment variable`)
    }
    this.incomingQueueUrl = INCOMING_QUEUE_URL
    this.outgoingQueueUrl = OUTGOING_QUEUE_URL
  }

  sendMessage = async (MessageBody: string) => {
    const queueRequestParams: SQS.Types.SendMessageRequest = {
      QueueUrl: this.outgoingQueueUrl,
      MessageBody,
    }
    this.sqs.sendMessage(queueRequestParams, (err, data) => {
      if (err) {
        logger.error(err)
        throw err
      } else {
        logger.info(data)
      }
    })
  }

  receiveMessage = async () => {
    const params: SQS.ReceiveMessageRequest = {
      QueueUrl: this.incomingQueueUrl,
      AttributeNames: ["All"],
      MaxNumberOfMessages: 10,
    }

    /**
     * Note: using `.promise` might be an issue. See more: https://github.com/aws/aws-sdk-js/issues/1453
     * Through some internal testing, this issue "seems" to have disappeared (it is an undeterministic bug), assumed to
     * be a safe operation for now.
     */
    const response = await this.sqs.receiveMessage(params).promise()
    if (response.$response.error) {
      logger.error(response.$response.error)
    }
    if (response.Messages) {
      this.deleteMessage(response)
    }
    return response.Messages
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
      const filteredReceiptHandles = receiptHandles.filter(
        (x): x is string => x !== null
      )
      filteredReceiptHandles.forEach((receiptHandle) => {
        try {
          this.sqs.deleteMessage(
            this.createDeleteMessageParams(receiptHandle),
            (err) => {
              if (err) {
                logger.error(err)
              }
            }
          )
        } catch (err) {
          logger.error(`error trying to delete message handle ${receiptHandle}`)
        }
      })
    }
  }
}
