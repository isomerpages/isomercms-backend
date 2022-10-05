import AWS, { SQS } from "aws-sdk"

import logger from "@root/logger/logger"

import QueueClient from "./QueueClient"

export default class QueueService {
  private readonly queueClient: QueueClient

  constructor() {
    this.queueClient = new QueueClient()
  }

  sendMessage = async (message: string) => this.queueClient.sendMessage(message)

  receiveMessage = async () => this.queueClient.receiveMessage()
}
