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
