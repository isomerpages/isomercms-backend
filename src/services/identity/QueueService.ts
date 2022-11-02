import { MessageBody } from "@root/../microservices/site-launch/shared/types"
import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor(queueClient?: QueueClient) {
    this.queueClient = queueClient ?? new QueueClient()
  }

  sendMessage = async (message: MessageBody) => {
    this.queueClient.sendMessage(JSON.stringify(message))
  }

  pollMessages = async () => {
    const messageBodies: MessageBody[] = []
    const messages = await this.queueClient.receiveMessage()
    try {
      messages?.forEach((message) => {
        if (!message.Body) return
        const parsedMessage = JSON.parse(message.Body)
        messageBodies.push(parsedMessage)
      })
    } catch (error) {
      logger.error(`error while parsing: ${messages}`)
    }
    return messageBodies
  }
}
