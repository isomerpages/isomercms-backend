// Allowed domains is a semicolon separate list of domains (e.g. .gov.sg, @agency.com.sg, etc)
// that are allowed to login.
const { DOMAIN_WHITELIST } = process.env

class UserService {
  constructor({ otp, mailer, smsClient, repository }) {
    this.repository = repository
    this.otp = otp
    this.mailer = mailer
    this.smsClient = smsClient

    this.whitelistDomains = (DOMAIN_WHITELIST || ".gov.sg")
      .split(";")
      .map((domain) => domain.toLowerCase().trim())
  }

  async findByEmail(email) {
    return this.repository.findOne({ where: { email } })
  }

  async findByGitHubId(githubId) {
    return this.repository.findOne({ where: { githubId } })
  }

  async updateUserByGitHubId(githubId, user) {
    await this.repository.update(user, { where: { githubId } })
  }

  async findOrCreate(githubId) {
    const [user] = await this.repository.findOrCreate({
      where: { githubId },
    })
    return user
  }

  async canSendEmailOtp(email) {
    const hasMatchDomain =
      this.whitelistDomains.filter((domain) => email.endsWith(domain)).length >
      0
    return hasMatchDomain
  }

  async sendEmailOtp(email) {
    const otp = this.otp.generate(email)
    const expiry = this.otp.getExpiryMinutes()

    const html = `<p>Your OTP is <b>${otp}</b>. It will expire in ${expiry} minutes. Please use this to verify your email address.</p>
    <p>If your OTP does not work, please request for a new OTP.</p>
    <p>IsomerCMS Support Team</p>`
    await this.mailer.sendMail(email, html)
  }

  verifyOtp(value, otp) {
    return this.otp.verify(value, otp)
  }
}

module.exports = UserService
