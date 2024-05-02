import express, { RequestHandler } from "express"

import BotService, { SlackPayload } from "./ops/botService"

export const isobotRouter = express.Router()
const botService = new BotService()

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
  const teamId = botService.whitelistEmails(req.body)
  console.log(teamId)
  return res.json({ message: "Hello, world!" })
}

isobotRouter.post("/whitelist-emails", handleWhitelistEmails)
isobotRouter.get("/hello", (req, res) => res.json({ message: "Hello, world!" }))
