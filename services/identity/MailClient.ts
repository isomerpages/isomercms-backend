import axios from "axios"

import logger from "@logger/logger"

const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class MailClient {
  // NOTE: This is set as a private readonly property
  // rather than a variable within the file for testing.
  // This is to allow us to test that initialization fails when the API key is empty
  private readonly POSTMAN_API_KEY: string

  constructor() {
    const { POSTMAN_API_KEY } = process.env
    if (!POSTMAN_API_KEY) {
      throw new Error("Postman.gov.sg API key cannot be empty.")
    }
    this.POSTMAN_API_KEY = POSTMAN_API_KEY
  }

  async sendMail(recipient: string, body: string): Promise<void> {
    const endpoint = `${POSTMAN_API_URL}/transactional/email/send`
    const email = {
      subject: "One-Time Password (OTP) for IsomerCMS",
      from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
      body,
      recipient,
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
