import logger from "@logger/logger"

import db from "@database/models"

import AuthService from "./AuthService"
import MailClient from "./MailClient"
import SitesService from "./SitesService"
import SmsClient from "./SmsClient"
import TokenStore from "./TokenStore"
import TotpGenerator from "./TotpGenerator"
import UsersService from "./UsersService"

const IS_LOCAL_DEV = process.env.NODE_ENV === "LOCAL_DEV"
const { OTP_EXPIRY, OTP_SECRET } = process.env

const services = {}

services.initializeIdentityServices = ({ axiosInstance }) => {
  const tokenStore = IS_LOCAL_DEV
    ? { getToken: (_apiTokenName) => process.env.LOCAL_SITE_ACCESS_TOKEN }
    : new TokenStore()
  const totpGenerator = new TotpGenerator({
    secret: OTP_SECRET,
    expiry: OTP_EXPIRY,
  })

  const mailer = IS_LOCAL_DEV
    ? { sendMail: (_email, html) => logger.info(html) }
    : new MailClient()
  const smsClient = IS_LOCAL_DEV
    ? { sendSms: (_mobileNumber, message) => logger.info(message) }
    : new SmsClient()

  const sitesService = new SitesService({ repository: db.Site, tokenStore })
  services.sitesService = sitesService

  const usersService = new UsersService({
    repository: db.User,
    otp: totpGenerator,
    mailer,
    smsClient,
  })
  services.usersService = usersService

  const authService = new AuthService({ axiosInstance })
  services.authService = authService

  return { authService, sitesService, usersService }
}

export default services
