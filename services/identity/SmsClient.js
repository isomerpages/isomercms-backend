const axios = require("axios")

const logger = require("@logger/logger")

const { POSTMAN_API_KEY, POSTMAN_SMS_CRED_NAME } = process.env
const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class SmsClient {
  constructor() {
    if (!POSTMAN_API_KEY)
      throw new Error("Postman.gov.sg API key cannot be empty.")

    this.client = axios.create({
      baseURL: POSTMAN_API_URL,
      headers: {
        Authorization: `Bearer ${POSTMAN_API_KEY}`,
      },
    })
  }

  async sendSms(recipient, body) {
    const endpoint = `/transactional/sms/send`
    const sms = {
      recipient,
      body,
      label: POSTMAN_SMS_CRED_NAME,
    }

    try {
      await this.client.post(endpoint, sms)
    } catch (err) {
      logger.error(err)
      throw new Error("Failed to send SMS.")
    }
  }
}

module.exports = SmsClient
