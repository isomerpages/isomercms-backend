import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export interface ErrorMessage {
  repoName: string
  primaryDomainSource: string
  requestorEmail: string
  agencyEmail: string
  success: false
  siteLaunchError: string
}

export interface SuccessMessage {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  requestorEmail: string
  agencyEmail: string
  githubRedirectionUrl?: string
  redirectionDomain?: [
    {
      source: string
      target: string
      type: string
    }
  ]
  success: true
}

export type MessageBody = ErrorMessage | SuccessMessage

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

  private parseMessageBody(message: string): MessageBody | null {
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
