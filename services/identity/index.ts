import logger from "@logger/logger"

import { User, Site } from "@database/models"
import { AxiosClient } from "@root/types"

import AuthService from "./AuthService"
import MailClient from "./MailClient"
import SitesService from "./SitesService"
import SmsClient from "./SmsClient"
import TokenStore from "./TokenStore"
import TotpGenerator from "./TotpGenerator"
import UsersService from "./UsersService"

const IS_LOCAL_DEV = process.env.NODE_ENV === "LOCAL_DEV"
const { OTP_EXPIRY, OTP_SECRET } = process.env

const tokenStore = IS_LOCAL_DEV
  ? (({
      getToken: (_apiTokenName: string) => process.env.LOCAL_SITE_ACCESS_TOKEN,
    } as unknown) as TokenStore)
  : new TokenStore()

if (!OTP_SECRET) {
  logger.error(
    "Please ensure that you have set OTP_SECRET in your env vars and that you have sourced them!"
  )
}

const totpGenerator = new TotpGenerator({
  secret: OTP_SECRET!,
  expiry: parseInt(OTP_EXPIRY!, 10) ?? undefined,
})

const mailer = IS_LOCAL_DEV
  ? { sendMail: (_email: string, html: string) => logger.info(html) }
  : new MailClient()

const smsClient = IS_LOCAL_DEV
  ? ({
      sendSms: (_mobileNumber: string, message: string) => logger.info(message),
    } as SmsClient)
  : new SmsClient()

export const sitesService = new SitesService({ repository: Site, tokenStore })

export const usersService = new UsersService({
  repository: User,
  otp: totpGenerator,
  mailer,
  smsClient,
})

export const getAuthService = (axiosClient: AxiosClient) =>
  new AuthService({ axiosClient })
