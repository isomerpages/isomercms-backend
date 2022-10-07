import QueueClient from "./QueueClient"

export interface MessageBody {
  repoName: string
  appId: string
  primaryDomain: string
  domainValidation: string
  githubRedirectionUrl?: string
}

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor() {
    this.queueClient = new QueueClient()
  }

  sendMessage = async (message: string) => this.queueClient.sendMessage(message)

  pollMessages = async () => {
    const messageBodies: MessageBody[] = []
    await (await this.queueClient.receiveMessage()).promise().then((res) => {
      res.Messages?.forEach((message) => {
        if (message.Body) {
          messageBodies.push(JSON.parse(message.Body))
        }
      })
    })
    return messageBodies
  }
}
