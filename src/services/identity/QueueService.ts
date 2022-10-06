import QueueClient from "./QueueClient"

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor() {
    this.queueClient = new QueueClient()
  }

  sendMessage = async (message: string) => this.queueClient.sendMessage(message)

  pollMessages = async () => {
    const messages: string[] = []
    await (await this.queueClient.receiveMessage()).promise().then((res) => {
      res.Messages?.forEach((message) => {
        if (message.Body) messages.push(message.Body)
      })
    })
    return messages
  }
}
