import { createHmac, timingSafeEqual } from "node:crypto"

import qs from "qs"

import { config } from "@config/config"

import logger from "@root/logger/logger"

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
        computedSig,
        signature,
        computedHash,
        signatureBasestr,
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

  public whitelistEmails(payload: SlackPayload) {
    console.log(payload)
    return payload.channel_id
  }
}

export default BotService
