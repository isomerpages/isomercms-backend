import {
  App,
  AuthorizationError,
  ExpressReceiver,
  Middleware,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt"
import { RequestHandler } from "express"

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

// TODO: add slack ids of isomer user
const ISOMER_USERS_ID = ["U01HTSFC0RY"]
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
const addUserContext: Middleware<SlackCommandMiddlewareArgs> = async ({
  payload,
  client,
  context,
  next,
}) => {
  const user = await client.users.info({
    user: payload.user_id,
  })

  context.user = user

  await next()
}

// NOTE: ALWAYS call this after `addUserContext`
const validateIsomerUser: Middleware<SlackCommandMiddlewareArgs> = async ({
  client,
  context,
  next,
}) => {
  // NOTE: Not calling `client.get` again - repeated work and also
  // we only have a 3s window to ACK slack (haven't ack yet)
  const user = context.user as Awaited<ReturnType<typeof client.users.info>>

  if (!user || !ISOMER_USERS_ID.some((userId) => userId === user.user?.id)) {
    throw new Error("Only Isomer members are allowed to use this command!")
  }

  next()
}

// FIXME: update this to proper signature
// bot.command("/whitelist-emails", handleWhitelistEmails)
