const db = require("@database/models")

const AuthService = require("./AuthService")
const SiteService = require("./SiteService")
const TokenStore = require("./TokenStore")

const IS_LOCAL_DEV = process.env.NODE_ENV === "LOCAL_DEV"

const tokenStore = IS_LOCAL_DEV
  ? { getToken: (_apiTokenName) => process.env.LOCAL_SITE_ACCESS_TOKEN }
  : new TokenStore()
const siteService = new SiteService(db.Site, tokenStore)
const authService = new AuthService()

module.exports = { authService, siteService }
