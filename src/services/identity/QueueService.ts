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
    }
  ]
}

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor() {
    this.queueClient = new QueueClient()
  }

  sendMessage = async (message: MessageBody) => {
    this.queueClient.sendMessage(JSON.stringify(message))
  }

  pollMessages = async () => {
    const messageBodies: MessageBody[] = []
    try {
      // Do not use a `.promise`. See more: https://github.com/aws/aws-sdk-js/issues/1453
      ;(await this.queueClient.receiveMessage())
        .on("extractData", (response) => {
          response.data?.Messages?.forEach((message) => {
            if (message.Body) {
              messageBodies.push(JSON.parse(message.Body))
            }
          })
        })
        .send()
    } catch (err) {
      logger.error(err)
    }
    return messageBodies
  }
}
