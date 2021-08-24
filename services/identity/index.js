const logger = require("@logger/logger")

const db = require("@database/models")

const AuthService = require("./AuthService")
const MailClient = require("./MailClient")
const SiteService = require("./SiteService")
const TokenStore = require("./TokenStore")
const TotpGenerator = require("./TotpGenerator")
const UserService = require("./UserService")

const IS_LOCAL_DEV = process.env.NODE_ENV === "LOCAL_DEV"
const { OTP_EXPIRY, OTP_SECRET } = process.env

const tokenStore = IS_LOCAL_DEV
  ? { getToken: (_apiTokenName) => process.env.LOCAL_SITE_ACCESS_TOKEN }
  : new TokenStore()
const totpGenerator = new TotpGenerator({
  secret: OTP_SECRET,
  expiry: OTP_EXPIRY,
})
const mailClient = new MailClient()

const siteService = new SiteService({ repository: db.Site, tokenStore })
const userService = new UserService({ repository: db.User })
const authService = new AuthService({
  otp: totpGenerator,
  mailer: IS_LOCAL_DEV
    ? { sendMail: (_email, html) => logger.info(html) }
    : mailClient,
  userService,
})

module.exports = { authService, siteService, userService }
