import axios from "axios"

import { config } from "@config/config"

import logger from "@logger/logger"

const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"
const MAIL_VERIFICATION_DELAY = 60000 // 60 seconds

type MailData = {
  id: string
  recipient: string
  status: string
}

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
      const sendMailResponse = await axios.post<MailData>(endpoint, email, {
        headers: {
          Authorization: `Bearer ${this.POSTMAN_API_KEY}`,
        },
      })
      this.verifyMail(sendMailResponse.data)
    } catch (err) {
      logger.error(`Error occurred when sending email to ${recipient}: ${err}`)
      throw new Error("Failed to send email.")
    }
  }

  async verifyMail(sendMailData: MailData): Promise<void> {
    const endpoint = `${POSTMAN_API_URL}/transactional/email/${sendMailData.id}`
    await new Promise((res) => setTimeout(res, MAIL_VERIFICATION_DELAY))
    const verifyMailResponse = await axios.get<MailData>(endpoint, {
      headers: {
        Authorization: `Bearer ${this.POSTMAN_API_KEY}`,
      },
    })
    this.logEmailStatus(verifyMailResponse.data)
  }

  logEmailStatus(verifyMailData: MailData) {
    const mailStatus = verifyMailData.status
    switch (mailStatus) {
      case "UNSENT":
        logger.error(
          `Email to ${verifyMailData.recipient} not accepted: ${verifyMailData}`
        )
        break
      case "ACCEPTED":
        logger.error(
          `Email to ${verifyMailData.recipient} not sent: ${verifyMailData}`
        )
        break
      case "SENT":
        logger.error(
          `Email to ${verifyMailData.recipient} not delivered: ${verifyMailData}`
        )
        break
      case "BOUNCED":
        logger.error(
          `Email to ${verifyMailData.recipient} rejected by recipient's mail server: ${verifyMailData}`
        )
        break
      default:
        logger.info(`Email delivered to ${verifyMailData.recipient}`)
        break
    }
  }
}
export default MailClient

const NODE_ENV = config.get("env")
const POSTMAN_API_KEY = config.get("postman.apiKey")

const IS_DEV = NODE_ENV === "dev"

const mockMailer = {
  sendMail: (email: string, subject: string, html: string) =>
    logger.info(`Mock email sent to <${email}>, subject: ${subject}\n${html}`),
} as MailClient
export const mailer = IS_DEV ? mockMailer : new MailClient(POSTMAN_API_KEY)
