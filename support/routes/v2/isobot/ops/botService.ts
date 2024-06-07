import { SlashCommand } from "@slack/bolt"
import { ok } from "neverthrow"

import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"
import { DnsCheckerResponse } from "@root/types/dnsChecker"
import { dnsMonitor } from "@root/utils/dns-utils"

class BotService {
  whitelistService: WhitelistService

  constructor(whitelistService: WhitelistService) {
    this.whitelistService = whitelistService
  }

  private getSlackMessage(message: string | string[]): DnsCheckerResponse {
    return {
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: typeof message === "string" ? message : message.join("\n"),
          },
        },
      ],
    }
  }

  public async whitelistEmails(text: string) {
    // Sample user input:
    // email1,expDate email2,expDate
    // email1@xyz.com,2024-06-22 email2@abc.com,2025-01-31
    const rawEmails = text.split(" ")
    const emails = rawEmails.map((email) => {
      const [emailStr, expStr] = email.split(",")
      const expDate = new Date(expStr)
      if (expDate.toString() === "Invalid Date") {
        logger.error({
          message: "Invalid date format when attempting to whitelist emails",
          meta: { expiry: expStr, email: emailStr },
        })
        throw new Error(`Invalid date format: ${expStr}`)
      }
      // Update timing of the expiry to be 16:00:00 +00
      // This is because the TZ of our locale is +8,
      // so this resolves to 12AM of the following day.
      expDate.setUTCHours(16, 0, 0, 0)
      return {
        email: emailStr,
        exp: expDate,
      }
    })
    logger.info({ message: "Whitelisting emails", meta: { emails } })

    await this.whitelistService.addWhitelist(emails)
  }

  getValidatedDomain(domain: string) {
    const DOMAIN_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/

    if (!DOMAIN_NAME_REGEX.test(domain)) {
      return false
    }

    return domain
  }

  dnsChecker(payload: SlashCommand) {
    // Step 1: Get the domain name provided by the user
    const { user_name: user, channel_name: channel, text: domain } = payload
    logger.info({
      message: "DNS check requested",
      meta: {
        method: "dnsChecker",
        user,
        channel,
        domain,
      },
    })

    return (
      dnsMonitor(domain)
        // when running the slack bot command, the slack bot
        // does not need to know what is the error state, it just needs the
        // string to show isomer admins of what the state is
        .orElse((res) => ok(res))
        .map((res) => this.getSlackMessage(res))
    )
  }
}

export default BotService
