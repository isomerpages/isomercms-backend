import axios from "axios"

import config from "@config/config"

import logger from "@logger/logger"

import { AxiosClient } from "@root/types"

const POSTMAN_SMS_CRED_NAME = config.get("postman.smsCredName")

const POSTMAN_API_URL = "https://api.postman.gov.sg/v1"

class SmsClient {
  private readonly axiosClient: AxiosClient

  constructor() {
    const POSTMAN_API_KEY = config.get("postman.apiKey")

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
      logger.error(`Failed to send SMS to ${recipient}: ${err}`)
      throw new Error("Failed to send SMS.")
    }
  }
}

export default SmsClient
