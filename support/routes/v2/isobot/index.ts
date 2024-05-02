import express, { RequestHandler } from "express"

import { Whitelist } from "@database/models"
import logger from "@root/logger/logger"
import WhitelistService from "@root/services/identity/WhitelistService"

import BotService, { SlackPayload } from "./ops/botService"

export const isobotRouter = express.Router()
const botService = new BotService(
  new WhitelistService({ repository: Whitelist })
)

const handleWhitelistEmails: RequestHandler<
  {},
  { message: string },
  SlackPayload,
  {},
  {}
> = async (req, res) => {
  console.log(req.headers)
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

isobotRouter.post("/whitelist-emails", handleWhitelistEmails)
isobotRouter.get("/hello", (req, res) => res.json({ message: "Hello, world!" }))
