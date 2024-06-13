import { App, ExpressReceiver } from "@slack/bolt"

import { Whitelist } from "@database/models"
import config from "@root/config/config"
import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"

import BotService from "./ops/botService"

const botService = new BotService(
  new WhitelistService({ repository: Whitelist })
)
const signingSecret = config.get("slackbot.secret")
const token = config.get("slackbot.token")

const botReceiver = new ExpressReceiver({ signingSecret, endpoints: "/" })
export const isobotRouter = botReceiver.router

const bot = new App({
  token,
  receiver: botReceiver,
})

// TODO: add in validation for user once downstream is merged
bot.command("/whitelist", async ({ payload, respond, ack }) => {
  await ack()

  try {
    await botService.whitelistEmails(payload.text)
    respond("Emails whitelisted successfully")
  } catch (e) {
    logger.error({ error: e })
    respond("Failed to whitelist emails")
  }
})

bot.command("/siteup", async ({ payload, respond, ack }) => {
  await ack()

  const validatedDomain = botService.getValidatedDomain(payload.text)
  if (!validatedDomain)
    return respond(
      `Sorry, \`${payload.text}\` is not a valid domain name. Please try again with a valid one instead.`
    )

  return botService.dnsChecker(payload).map((response) => respond(response))
})
