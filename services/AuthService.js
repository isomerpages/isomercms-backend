const axios = require("axios")

const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
// Allowed domains is a semicolon separate list of domains (e.g. .gov.sg, @agency.com.sg, etc)
// that are allowed to login.
const { DOMAIN_WHITELIST } = process.env

class AuthService {
  constructor(otp, mailer, userService) {
    this.otp = otp
    this.mailer = mailer
    this.userService = userService
    this.whitelistDomains = (DOMAIN_WHITELIST || ".gov.sg")
      .split(";")
      .map((domain) => domain.toLowerCase().trim())
  }

  async hasAccessToSite(siteName, userId, accessToken) {
    const endpoint = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${siteName}/collaborators/${userId}`

    try {
      await axios.get(endpoint, {
        headers: {
          Authorization: `token ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      return true
    } catch (err) {
      const { status } = err.response
      if (status === 404 || status === 403) {
        return false
      }
      throw err
    }
  }

  async canSendOtp(email) {
    const hasMatchDomain =
      this.whitelistDomains.filter((domain) => email.endsWith(domain)).length >
      0
    const user = await this.userService.findByEmail(email)

    // Send OTP if either the user's email match a whitelisted domain or the user already
    // been explicitly whitelisted by adding an entry in the users table.
    return hasMatchDomain || user !== null
  }

  async sendOtp(email) {
    const otp = this.otp.generate(email)
    const expiry = this.otp.getExpiryMinutes()

    const html = `<p>Your OTP is <b>${otp}</b>. It will expire in ${expiry} minutes. Please use this to login to your account.</p>
    <p>If your OTP does not work, please request for a new OTP.</p>
    <p>IsomerCMS Support Team</p>`
    await this.mailer.sendMail(email, html)
  }

  verifyOtp(email, otp) {
    return this.otp.verify(email, otp)
  }
}

module.exports = AuthService
