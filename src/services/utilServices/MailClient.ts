import axios from "axios"

import { config } from "@config/config"

import logger from "@logger/logger"

const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class MailClient {
  POSTMAN_API_KEY: string

  constructor(apiKey: string) {
    this.POSTMAN_API_KEY = apiKey
  }

  async sendMail(
    recipient: string,
    subject: string,
    body: string
  ): Promise<void> {
    const endpoint = `${POSTMAN_API_URL}/transactional/email/send`
    const email = {
      subject,
      from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
      body,
      recipient,
      reply_to: "noreply@isomer.gov.sg",
    }

    try {
      await axios.post(endpoint, email, {
        headers: {
          Authorization: `Bearer ${this.POSTMAN_API_KEY}`,
        },
      })
    } catch (err) {
      logger.error(`Error occurred when sending email to ${recipient}: ${err}`)
      throw new Error("Failed to send email.")
    }
  }
}
export default MailClient

const NODE_ENV = config.get("env")
const POSTMAN_API_KEY = config.get("postman.apiKey")

const IS_LOCAL_DEV = NODE_ENV === "LOCAL_DEV"

const mockMailer = {
  sendMail: (email: string, subject: string, html: string) =>
    logger.info(`Mock email sent to <${email}>, subject: ${subject}\n${html}`),
} as MailClient
export const mailer = IS_LOCAL_DEV
  ? mockMailer
  : new MailClient(POSTMAN_API_KEY)
