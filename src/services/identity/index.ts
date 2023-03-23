import { Sequelize } from "sequelize-typescript"

import { config } from "@config/config"

import logger from "@logger/logger"

import {
  User,
  Whitelist,
  IsomerAdmin,
  Notification,
  SiteMember,
  Otp,
} from "@database/models"
import { GitHubService } from "@services/db/GitHubService"
import SmsClient from "@services/identity/SmsClient"
import TotpGenerator from "@services/identity/TotpGenerator"
import { mailer } from "@services/utilServices/MailClient"

import AuthService from "./AuthService"
import IsomerAdminsService from "./IsomerAdminsService"
import NotificationsService from "./NotificationsService"
import OtpService from "./OtpService"
import UsersService from "./UsersService"

const NODE_ENV = config.get("env")
const OTP_SECRET = config.get("auth.otpSecret")
const OTP_EXPIRY = config.get("auth.otpExpiry")

const IS_LOCAL_DEV = NODE_ENV === "dev"

// TODO: To remove TOTP
const totpGenerator = new TotpGenerator({
  secret: OTP_SECRET,
  expiry: OTP_EXPIRY,
})

const smsClient = IS_LOCAL_DEV
  ? ({
      sendSms: (_mobileNumber: string, message: string) => logger.info(message),
    } as SmsClient)
  : new SmsClient()

export const otpService = new OtpService()

// NOTE: This is because the usersService requires an instance of sequelize
// as it requires a transaction for certain methods
export const getUsersService = (sequelize: Sequelize) =>
  new UsersService({
    repository: User,
    mailer,
    smsClient,
    sequelize,
    whitelist: Whitelist,
    otpService,
    otpRepository: Otp,
  })

// NOTE: This is because the identity auth service has an
// explicit dependency on GitHubService so we have to pass
// the GithubService instance in...
export const getIdentityAuthService = (gitHubService: GitHubService) =>
  new AuthService({ gitHubService })

export const isomerAdminsService = new IsomerAdminsService({
  repository: IsomerAdmin,
})

export const notificationsService = new NotificationsService({
  repository: Notification,
  siteMember: SiteMember,
})
