import axios from "axios"

import { config } from "@config/config"

import logger from "@logger/logger"

const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"
const MAIL_VERIFICATION_DELAY = 60000 // 60 seconds

const MailStatus = {
  Unsent: "UNSENT",
  Accepted: "ACCEPTED",
  Sent: "SENT",
  Bounced: "BOUNCED",
  Delivered: "DELIVERED",
  Opened: "OPENED",
} as const

type MailStatusKeys = typeof MailStatus[keyof typeof MailStatus]

type MailData = {
  id: string
  recipient: string
  status: MailStatusKeys
  error_code: string
}

const BLACKLISTED_RECIPIENT_ERROR_CODE = "Error 400: Blacklisted recipient"

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
    const sendEndpoint = `${POSTMAN_API_URL}/transactional/email/send`
    const email = {
      subject,
      from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
      body,
      recipient,
      reply_to: "noreply@isomer.gov.sg",
    }

    try {
      const sendMailResponse = await axios.post<MailData>(sendEndpoint, email, {
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
    const verifyEndpoint = `${POSTMAN_API_URL}/transactional/email/${sendMailData.id}`
    await new Promise((res) => setTimeout(res, MAIL_VERIFICATION_DELAY))
    const verifyMailResponse = await axios.get<MailData>(verifyEndpoint, {
      headers: {
        Authorization: `Bearer ${this.POSTMAN_API_KEY}`,
      },
    })
    // NOTE: For tests where the main routine has already ended, mockAxios is terminated
    // and will return undefined for verifyMailResponse. In order to pass the test, we
    // need to check if it is a valid response. This should not happen in application.
    if (verifyMailResponse) {
      this.logEmailStatus(verifyMailResponse.data)
    }
  }

  logEmailStatus(verifyMailData: MailData) {
    const mailStatus = verifyMailData.status
    switch (mailStatus) {
      case MailStatus.Delivered:
      case MailStatus.Opened:
        logger.info(`Email delivered to ${verifyMailData.recipient}`)
        break
      case MailStatus.Unsent:
        if (verifyMailData.error_code === BLACKLISTED_RECIPIENT_ERROR_CODE) {
          logger.warn(
            `Email to blacklisted recipient ${verifyMailData.recipient} not accepted: ${verifyMailData}`
          )
        } else {
          logger.warn(
            `Email to ${verifyMailData.recipient} not accepted: ${verifyMailData}`
          )
        }
        break
      case MailStatus.Accepted:
        logger.warn(
          `Email to ${verifyMailData.recipient} not sent: ${verifyMailData}`
        )
        break
      case MailStatus.Sent:
        logger.warn(
          `Email to ${verifyMailData.recipient} not delivered: ${verifyMailData}`
        )
        break
      case MailStatus.Bounced:
        logger.warn(
          `Email to ${verifyMailData.recipient} rejected by recipient's mail server: ${verifyMailData}`
        )
        break
      default: {
        const unknownMailStatus: never = mailStatus
        logger.warn(
          `Email to ${verifyMailData.recipient} encounter unknown status: ${unknownMailStatus}`
        )
        break
      }
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
