import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export interface MessageBody {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  githubRedirectionUrl?: string
  redirectionDomain?: [
    {
      source: string
      target: string
      type: string
    }
  ]
  success?: boolean
}

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
        if (message.Body) {
          messageBodies.push(JSON.parse(message.Body))
        }
      })
    } catch (error) {
      logger.error(`error while parsing: ${messages}`)
    }
    return messageBodies
  }
}
