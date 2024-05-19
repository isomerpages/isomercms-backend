import { createHmac, timingSafeEqual } from "node:crypto"

import qs from "qs"

import { config } from "@config/config"

import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"

export interface SlackPayload {
  token: string
  team_id: string
  team_domain: string
  channel_id: string
  channel_name: string
  user_id: string
  user_name: string
  command: string
  text: string
}

class BotService {
  whitelistService: WhitelistService

  constructor(whitelistService: WhitelistService) {
    this.whitelistService = whitelistService
  }

  public verifySignature(
    signature: string,
    timestamp: string,
    payload: SlackPayload
  ) {
    // Verify timestamp is within 5 minutes
    const currentTime = new Date().getTime() / 1000
    const slackTimestamp = parseInt(timestamp)

    if (Math.abs(currentTime - slackTimestamp) > 300) {
      return false
    }

    // Create HMAC with the signing secret and the timestamp
    const signingSecret = config.get("slackbot.secret")
    const versionNumber = "v0"
    const reqBody = qs.stringify(payload, { format: "RFC1738" })
    const signatureBasestr = `${versionNumber}:${timestamp}:${reqBody}`
    const computedHash = createHmac("sha256", signingSecret)
      .update(signatureBasestr)
      .digest("hex")
    const computedSig = `${versionNumber}=${computedHash}`

    logger.info({
      message: `Slack verification metadata`,
      meta: {
        currentTime,
        slackTimestamp,
        reqBody,
      },
    })

    if (timingSafeEqual(Buffer.from(signature), Buffer.from(computedSig))) {
      logger.info({ message: "Signature verified" })
      return true
    }
    logger.error({ message: "Signature verification failed" })
    return false
  }

  public async whitelistEmails(payload: SlackPayload) {
    // Sample user input:
    // email1,expDate email2,expDate
    // email1@xyz.com,2024-06-22 email2@abc.com,2025-01-31
    const rawEmails = payload.text.split(" ")
    const emails = rawEmails.map((email) => {
      const [emailStr, expStr] = email.split(",")
      const expDate = new Date(expStr)
      if (expDate.toString() === "Invalid Date") {
        logger.error({
          message: "Invalid date format when attempting to whitelist emails",
          meta: { expStr },
        })
        throw new Error(`Invalid date format: ${expStr}`)
      }
      // Update timing of the expiry to be 16:00:00 +00
      expDate.setUTCHours(16, 0, 0, 0)
      return {
        email: emailStr,
        exp: expDate,
      }
    })
    logger.info({ message: "Whitelisting emails", meta: { emails } })

    await this.whitelistService.addWhitelist(emails)
  }
}

export default BotService
