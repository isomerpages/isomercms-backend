import { App, ExpressReceiver } from "@slack/bolt"
import { RequestHandler } from "express"

import { Whitelist } from "@database/models"
import config from "@root/config/config"
import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"
import type { DnsCheckerResponse } from "@root/types/dnsChecker"

import BotService, { SlackPayload } from "./ops/botService"

const botService = new BotService(
  new WhitelistService({ repository: Whitelist })
)
const signingSecret = config.get("slackbot.secret")
const token = config.get("slackbot.token")

const botReceiver = new ExpressReceiver({ signingSecret, endpoints: "/" })
export const isobotRouter = botReceiver.router

const bot = new App({
  signingSecret,
  token,
  endpoints: "/",
  receiver: botReceiver,
})

const handleWhitelistEmails: RequestHandler<
  {},
  { message: string },
  SlackPayload,
  {},
  {}
> = async (req, res) => {
  const slackTimestamp = req.headers["x-slack-request-timestamp"] as string
  const slackSig = req.headers["x-slack-signature"] as string

  if (!slackTimestamp || !slackSig)
    return res.send({ message: "Missing header/signature" })

  const isVerifiedMessage = botService.verifySignature(
    slackSig,
    slackTimestamp,
    req.body
  )
  if (!isVerifiedMessage) return res.send({ message: "Invalid signature" })

  try {
    await botService.whitelistEmails(req.body)
    return res.send({ message: "Emails whitelisted successfully" })
  } catch (e) {
    logger.error({ error: e })
    return res.send({ message: "Failed to whitelist emails" })
  }
}

const handleDnsChecker: RequestHandler<
  never,
  DnsCheckerResponse | { message: string },
  SlackPayload,
  unknown,
  never
> = async (req, res) => {
  const validatedDomain = botService.getValidatedDomain(req.body)
  if (!validatedDomain)
    return res.status(200).send({
      message: `Sorry, \`${req.body.text}\` is not a valid domain name. Please try again with a valid one instead.`,
    })

  return botService
    .dnsChecker(req.body)
    .map((response) => res.status(200).send(response))
}

isobotRouter.post("/dns-checker", handleDnsChecker)
isobotRouter.post("/whitelist-emails", handleWhitelistEmails)
// FIXME: update this to proper signature
// bot.command("/whitelist-emails", handleWhitelistEmails)
