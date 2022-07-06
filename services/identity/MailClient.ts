import axios from "axios"

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
      logger.error(err)
      throw new Error("Failed to send email.")
    }
  }
}
export default MailClient

const { NODE_ENV, POSTMAN_API_KEY } = process.env

const IS_LOCAL_DEV = NODE_ENV === "LOCAL_DEV"

if (!POSTMAN_API_KEY && !IS_LOCAL_DEV) {
  throw new Error(
    "Please ensure that you have set POSTMAN_API_KEY in your env vars and that you have sourced them!"
  )
}

const mockMailer = {
  sendMail: (email: string, subject: string, html: string) =>
    logger.info(`Mock email sent to <${email}>, subject: ${subject}\n${html}`),
} as MailClient
export const mailer = IS_LOCAL_DEV
  ? mockMailer
  : new MailClient(POSTMAN_API_KEY!)
