import {
  App,
  ExpressReceiver,
  Middleware,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt"
import { RequestHandler } from "express"
import { okAsync } from "neverthrow"

import { repairService } from "@common/index"
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
const BOT_AUDIT_CHANNEL_ID = "C075Z617GCQ"
const bot = new App({
  token,
  receiver: botReceiver,
})

const cloneRepoCommmand = bot.command(
  "/clone",
  async ({ command, ack, respond, payload, client }) => {
    await ack()

    const HELP_TEXT =
      "Usage: `/clone <github_repo_name>`. Take note that this locks the repo for 15 minutes by default. To bypass this behaviour, add `-n` at the end of the command"
    const tokens = command.text.split(" ")

    const hasUnrecognisedLastToken = tokens.length === 2 && tokens[1] !== "-n"
    if (tokens.length < 1 || hasUnrecognisedLastToken) {
      return respond(HELP_TEXT)
    }

    // NOTE: Invariant maintained:
    // 1. we always need 0 < tokens.length < 3
    // 2. token at index 0 is always the github repository
    // 3. token at index 1 is always the "-n" option
    const isHelp = tokens[0].toLowerCase() === "help"
    if (isHelp) {
      return respond(HELP_TEXT)
    }

    const repo = tokens[0]
    const shouldLock = tokens.length === 2 && tokens[1] === "-n"
    await client.chat.postMessage({
      channel: BOT_AUDIT_CHANNEL_ID,
      text: `${payload.user_id} attempting to clone repo: ${repo} to EFS. Should lock: ${shouldLock}`,
    })

    const base = shouldLock ? repairService.lockRepo(tokens[0]) : okAsync("")
    return base
      .andThen(repairService.cloneRepo)
      .map(() => respond(`${repo} was successfully cloned to efs!`))
      .mapErr((e) => respond(`${e} occurred while cloning repo to efs`))
  }
)

const lockRepoCommand = bot.command(
  "/lock",
  async ({ command, ack, respond, payload, client }) => {
    await ack()

    const HELP_TEXT =
      "Usage: `/lock <github_repo_name> -d <duration_in_minutes>`. Take note that this locks the repo for 15 minutes by default if `-d` is not specified"
    const tokens = command.text.split(" ")
    // NOTE: Invariant maintained:
    // 1. tokens.length === 1 || tokens.length === 3
    // 2. token at index 0 is always the github repository
    // 3. if tokens.length === 3, then the last element must not be `NaN`
    const isShortCommand = tokens.length === 1
    const isLongCommand =
      tokens.length === 3 &&
      !Number.isNaN(parseInt(tokens[2], 10)) &&
      tokens[1] === "-d"
    if (!isShortCommand || !isLongCommand) {
      return respond(HELP_TEXT)
    }

    const repo = tokens[0]
    const lockTimeMinutes = isLongCommand ? parseInt(tokens[2], 10) : 15
    const lockTimeSeconds = lockTimeMinutes * 60
    await client.chat.postMessage({
      channel: BOT_AUDIT_CHANNEL_ID,
      text: `${payload.user_id} attempting to lock repo: ${repo} for ${lockTimeMinutes}`,
    })

    return repairService
      .lockRepo(repo, lockTimeSeconds)
      .map((repo) => {
        respond(
          `${repo} was successfully locked for ${lockTimeMinutes} minutes!`
        )
      })
      .mapErr((e) => respond(`${e} occurred while attempting to lock repo`))
  }
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

const validateIsomerUser: Middleware<SlackCommandMiddlewareArgs> = async ({
  payload,
  client,
  next,
}) => {
  // NOTE: Not calling `client.get` again - repeated work and also
  // we only have a 3s window to ACK slack (haven't ack yet)
  if (!ISOMER_USERS_ID.some((userId) => userId === payload.user_id)) {
    await client.chat.postEphemeral({
      channel: payload.channel,
      user: payload.user_id,
      text: `Sorry @${payload.user_id}, only Isomer members are allowed to use this command!`,
    })
    await client.chat.postMessage({
      channel: BOT_AUDIT_CHANNEL_ID,
      text: `Attempted access by @${payload.user_id}`,
    })
    throw new Error("Non-isomer member")
  }

  next()
}

// FIXME: update this to proper signature
// bot.command("/whitelist-emails", handleWhitelistEmails)
