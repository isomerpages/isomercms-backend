const axios = require("axios")

const mailClient = require("@services/MailClient")
const totpGenerator = require("@services/TotpGenerator")

const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME

class AuthService {
  constructor(otp, mailer) {
    this.otp = otp
    this.mailer = mailer
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

  canSendOtp(email) {
    return true
  }

  async sendOtp(email) {
    const otp = this.otp.generate(email)
    const html = `Your OTP is <b>${otp}</b>. It will expire in 5 minutes.
      Please use this to login to your account.`
    await this.mailer.sendMail(email, html)
  }

  async verifyOtp(email, otp) {
    return this.otp.verify(email, otp)
  }
}

module.exports = new AuthService(totpGenerator, mailClient)
