import { Op, ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"
import { RequireAtLeastOne } from "type-fest"

import { User, Whitelist } from "@database/models"

import MailClient from "./MailClient"
import SmsClient from "./SmsClient"
import TotpGenerator from "./TotpGenerator"

interface UsersServiceProps {
  otp: TotpGenerator
  mailer: MailClient
  smsClient: SmsClient
  repository: ModelStatic<User>
  sequelize: Sequelize
  whitelist: ModelStatic<Whitelist>
}

class UsersService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly otp: UsersServiceProps["otp"]

  private readonly mailer: UsersServiceProps["mailer"]

  private readonly smsClient: UsersServiceProps["smsClient"]

  private readonly repository: UsersServiceProps["repository"]

  private readonly sequelize: UsersServiceProps["sequelize"]

  private readonly whitelist: UsersServiceProps["whitelist"]

  constructor({
    otp,
    mailer,
    smsClient,
    repository,
    sequelize,
    whitelist,
  }: UsersServiceProps) {
    this.otp = otp
    this.mailer = mailer
    this.smsClient = smsClient
    this.repository = repository
    this.sequelize = sequelize
    this.whitelist = whitelist
  }

  async findByEmail(email: string) {
    return this.repository.findOne({ where: { email } })
  }

  async findByGitHubId(githubId: string) {
    return this.repository.findOne({ where: { githubId } })
  }

  async updateUserByGitHubId(
    githubId: string,
    // NOTE: This ensures that the caller passes in at least 1 property of User
    user: RequireAtLeastOne<User, keyof User>
  ) {
    await this.repository.update(user, { where: { githubId } })
  }

  async findOrCreate(githubId: string | undefined) {
    const [user] = await this.repository.findOrCreate({
      where: { githubId },
    })
    return user
  }

  async login(githubId: string): Promise<User> {
    return this.sequelize.transaction<User>(async (transaction) => {
      // NOTE: The service's findOrCreate is not being used here as this requires an explicit transaction
      const [user] = await this.repository.findOrCreate({
        where: { githubId },
        transaction,
      })
      user.lastLoggedIn = new Date()
      return user.save({ transaction })
    })
  }

  async canSendEmailOtp(email: string) {
    const whitelistEntries = await this.whitelist.findAll({
      attributes: ["email"],
      where: {
        expiry: {
          [Op.or]: [{ [Op.is]: null }, { [Op.gt]: new Date() }],
        },
      },
    })
    const whitelistDomains = whitelistEntries.map((entry) => entry.email)
    const hasMatchDomain =
      whitelistDomains.filter((domain) => email.endsWith(domain)).length > 0
    return hasMatchDomain
  }

  async sendEmailOtp(email: string) {
    const otp = this.otp.generate(email)
    const expiry = this.otp.getExpiryMinutes()

    const html = `<p>Your OTP is <b>${otp}</b>. It will expire in ${expiry} minutes. Please use this to verify your email address.</p>
    <p>If your OTP does not work, please request for a new OTP.</p>
    <p>IsomerCMS Support Team</p>`
    await this.mailer.sendMail(email, html)
  }

  async sendSmsOtp(mobileNumber: string) {
    const otp = this.otp.generate(mobileNumber)
    const expiry = this.otp.getExpiryMinutes()

    const message = `Your OTP is ${otp}. It will expire in ${expiry} minutes. Please use this to verify your mobile number`
    await this.smsClient.sendSms(mobileNumber, message)
  }

  verifyOtp(value: string, otp: string) {
    return this.otp.verify(value, otp)
  }
}

export default UsersService
