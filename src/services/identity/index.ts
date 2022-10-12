import { Sequelize } from "sequelize-typescript"

import logger from "@logger/logger"

import { User, Whitelist, IsomerAdmin } from "@database/models"
import { GitHubService } from "@services/db/GitHubService"
import SmsClient from "@services/identity/SmsClient"
import TotpGenerator from "@services/identity/TotpGenerator"
import { mailer } from "@services/utilServices/MailClient"

import AuthService from "./AuthService"
import IsomerAdminsService from "./IsomerAdminsService"
import UsersService from "./UsersService"

const { OTP_EXPIRY, OTP_SECRET, NODE_ENV } = process.env

const IS_LOCAL_DEV = NODE_ENV === "LOCAL_DEV"

if (!OTP_SECRET) {
  throw new Error(
    "Please ensure that you have set OTP_SECRET in your env vars and that you have sourced them!"
  )
}

const totpGenerator = new TotpGenerator({
  secret: OTP_SECRET!,
  expiry: parseInt(OTP_EXPIRY!, 10) ?? undefined,
})

const smsClient = IS_LOCAL_DEV
  ? ({
      sendSms: (_mobileNumber: string, message: string) => logger.info(message),
    } as SmsClient)
  : new SmsClient()

// NOTE: This is because the usersService requires an instance of sequelize
// as it requires a transaction for certain methods
export const getUsersService = (sequelize: Sequelize) =>
  new UsersService({
    repository: User,
    otp: totpGenerator,
    mailer,
    smsClient,
    sequelize,
    whitelist: Whitelist,
  })

// NOTE: This is because the identity auth service has an
// explicit dependency on GitHubService so we have to pass
// the GithubService instance in...
export const getIdentityAuthService = (gitHubService: GitHubService) =>
  new AuthService({ gitHubService })

export const isomerAdminsService = new IsomerAdminsService({
  repository: IsomerAdmin,
})
