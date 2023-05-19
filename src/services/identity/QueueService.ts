import { SiteLaunchMessage } from "@root/../microservices/site-launch/shared/types"
import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor(queueClient?: QueueClient) {
    this.queueClient = queueClient ?? new QueueClient()
  }

  sendMessage = async (message: SiteLaunchMessage) => {
    this.queueClient.sendMessage(JSON.stringify(message))
  }

  pollMessages = async () => {
    const messageBodies: SiteLaunchMessage[] = []
    const messages = await this.queueClient.receiveMessage()

    messages?.forEach((message) => {
      if (message.Body) {
        const parsedMessage = this.parseMessageBody(message.Body)
        if (parsedMessage) {
          messageBodies.push(parsedMessage)
        }
      }
    })

    return messageBodies
  }

  private parseMessageBody(message: string): SiteLaunchMessage | null {
    let parsedMessage = null
    try {
      if (message) {
        parsedMessage = JSON.parse(message)
      }
    } catch (error) {
      logger.error(`error while parsing: ${message}`)
    }
    return parsedMessage
  }
}
