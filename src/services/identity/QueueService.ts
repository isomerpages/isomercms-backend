import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export interface MessageBody {
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
  success?: boolean
  siteLaunchError?: string
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
        console.log(JSON.stringify(message))

        if (!message.Body) return

        let parsedMessage

        /**
         * The shape of messages are different as they can come from two different lambdas (success and failure)
         * The code below parses the it according to the type of message it comes from
         */

        // from error lambda
        if (JSON.parse(message.Body).Records) {
          /**
           * Message from SQS wraps the message body with a 'Records'. eg.
           * {
           *   ...
           *   Body {
           *      Records: [{
           *        ...
           *         body: <message Body Content>
           *        ...
           *      }]
           *   }
           *  ...
           * }
           * Thus, to get the final message in `body`, there is a need to have multiple
           * layers of JSON.parse().
           */

          parsedMessage = JSON.parse(JSON.parse(message.Body).Records[0].body)
        } else {
          /**
           * Message shape is as such:
           * {
           *  ...
           *  "Body":  <messagebody>
           * }
           *
           */

          parsedMessage = JSON.parse(message.Body)
          console.log(parsedMessage)
        }

        messageBodies.push(parsedMessage)
      })
    } catch (error) {
      logger.error(`error while parsing: ${messages}`)
    }
    return messageBodies
  }
}
