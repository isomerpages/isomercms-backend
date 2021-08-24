const axios = require("axios")

const logger = require("@logger/logger")

const { POSTMAN_API_KEY, POSTMAN_SMS_CRED_NAME } = process.env
const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class SmsClient {
  async sendSms(recipient, body) {
    if (!POSTMAN_API_KEY)
      throw new Error("Postman.gov.sg API key cannot be empty.")

    const endpoint = `${POSTMAN_API_URL}/transactional/sms/send`
    const sms = {
      recipient,
      body,
      label: POSTMAN_SMS_CRED_NAME,
    }

    try {
      await axios.post(endpoint, sms, {
        headers: {
          Authorization: `Bearer ${POSTMAN_API_KEY}`,
        },
      })
    } catch (err) {
      logger.error(err)
      throw new Error("Failed to send SMS.")
    }
  }
}

module.exports = SmsClient
