import axios from "axios"

import logger from "@logger/logger"

import { AxiosClient } from "@root/types"

const { POSTMAN_API_KEY, POSTMAN_SMS_CRED_NAME } = process.env
const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class SmsClient {
  axiosClient: AxiosClient

  constructor() {
    if (!POSTMAN_API_KEY)
      throw new Error("Postman.gov.sg API key cannot be empty.")

    this.axiosClient = axios.create({
      baseURL: POSTMAN_API_URL,
      headers: {
        Authorization: `Bearer ${POSTMAN_API_KEY}`,
      },
    })
  }

  async sendSms(recipient: string, body: string): Promise<void> {
    const endpoint = `/transactional/sms/send`
    const sms = {
      recipient,
      body,
      label: POSTMAN_SMS_CRED_NAME,
    }

    try {
      await this.axiosClient.post(endpoint, sms)
    } catch (err) {
      logger.error(err)
      throw new Error("Failed to send SMS.")
    }
  }
}

export default SmsClient
