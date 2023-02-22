import { Op, ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"
import { RequireAtLeastOne } from "type-fest"

import { Otp, Repo, Site, User, Whitelist, SiteMember } from "@database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import { milliSecondsToMinutes } from "@root/utils/time-utils"
import SmsClient from "@services/identity/SmsClient"
import TotpGenerator from "@services/identity/TotpGenerator"
import MailClient from "@services/utilServices/MailClient"

import OtpService from "./OtpService"

const { OTP_EXPIRY, MAX_NUM_OTP_ATTEMPTS } = process.env

const PARSED_EXPIRY = parseInt(OTP_EXPIRY || "", 10) ?? undefined

const PARSED_MAX_NUM_OTP_ATTEMPTS =
  parseInt(MAX_NUM_OTP_ATTEMPTS || "", 10) ?? 5

export enum OtpType {
  Email = "EMAIL",
  Mobile = "MOBILE",
}

interface UsersServiceProps {
  mailer: MailClient
  smsClient: SmsClient
  repository: ModelStatic<User>
  sequelize: Sequelize
  whitelist: ModelStatic<Whitelist>
  otpService: OtpService
  otpRepository: ModelStatic<Otp>
}

class UsersService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.

  private readonly mailer: UsersServiceProps["mailer"]

  private readonly smsClient: UsersServiceProps["smsClient"]

  private readonly repository: UsersServiceProps["repository"]

  private readonly sequelize: UsersServiceProps["sequelize"]

  private readonly whitelist: UsersServiceProps["whitelist"]

  private readonly otpService: UsersServiceProps["otpService"]

  private readonly otpRepository: UsersServiceProps["otpRepository"]

  constructor({
    mailer,
    smsClient,
    repository,
    sequelize,
    whitelist,
    otpService,
    otpRepository,
  }: UsersServiceProps) {
    this.mailer = mailer
    this.smsClient = smsClient
    this.repository = repository
    this.sequelize = sequelize
    this.whitelist = whitelist
    this.otpService = otpService
    this.otpRepository = otpRepository
  }

  async findById(id: string) {
    return this.repository.findOne({ where: { id } })
  }

  async findByEmail(email: string) {
    return this.repository.findOne({ where: { email } })
  }

  async findByGitHubId(githubId: string) {
    return this.repository.findOne({ where: { githubId } })
  }

  async getSiteMember(userId: string, siteName: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id: userId },
      include: [
        {
          model: Site,
          as: "site_members",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })
  }

  async getSiteAdmin(userId: string, siteName: string) {
    return this.repository.findOne({
      where: { id: userId, role: "ADMIN" },
      include: [
        {
          model: SiteMember,
          as: "site_members",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })
  }

  async findSitesByUserId(
    isomerId: string
  ): Promise<
    User & { site_members: Array<Site & { SiteMember: SiteMember }> }
  > {
    // NOTE: The type casting is necessary to allow site_members to be
    // safely read
    return this.repository.findOne({
      where: { id: isomerId },
      include: [
        {
          model: Site,
          as: "site_members",
          required: true,
          include: [{ model: Repo, required: true }],
        },
      ],
    }) as Promise<
      User & { site_members: Array<Site & { SiteMember: SiteMember }> }
    >
  }

  async updateUserByGitHubId(
    githubId: string,
    // NOTE: This ensures that the caller passes in at least 1 property of User
    user: RequireAtLeastOne<User, keyof User>
  ) {
    await this.repository.update(user, { where: { githubId } })
  }

  async updateUserByIsomerId(
    isomerId: string,
    // NOTE: This ensures that the caller passes in at least 1 property of User
    user: RequireAtLeastOne<User, keyof User>
  ) {
    await this.repository.update(user, { where: { id: isomerId } })
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

  async loginWithEmail(email: string): Promise<User> {
    return this.sequelize.transaction<User>(async (transaction) => {
      // NOTE: The service's findOrCreate is not being used here as this requires an explicit transaction
      const [user] = await this.repository.findOrCreate({
        where: { email },
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
    const { otp, hashedOtp } = await this.otpService.generateLoginOtpWithHash()

    // Reset attempts to login
    const otpEntry = await this.otpRepository.findOne({ where: { email } })
    if (!otpEntry) {
      // create new entry
      await this.createOtpEntry(email, OtpType.Email, hashedOtp)
    } else {
      await otpEntry?.update({
        hashedOtp,
        attempts: 0,
        expiresAt: this.getOtpExpiry(),
      })
    }

    const subject = "One-Time Password (OTP) for IsomerCMS"
    const html = `<p>Your OTP is <b>${otp}</b>. It will expire in ${milliSecondsToMinutes(
      PARSED_EXPIRY
    )} minutes. Please use this to verify your email address.</p>
    <p>If your OTP does not work, please request for a new OTP.</p>
    <p>IsomerCMS Support Team</p>`
    await this.mailer.sendMail(email, subject, html)
  }

  async sendSmsOtp(mobileNumber: string) {
    const { otp, hashedOtp } = await this.otpService.generateLoginOtpWithHash()

    // Reset attempts to login
    const otpEntry = await this.otpRepository.findOne({
      where: { mobileNumber },
    })
    if (!otpEntry) {
      await this.createOtpEntry(mobileNumber, OtpType.Mobile, hashedOtp)
    } else {
      await otpEntry?.update({ hashedOtp, attempts: 0 })
    }

    const message = `Your OTP is ${otp}. It will expire in ${milliSecondsToMinutes(
      PARSED_EXPIRY
    )} minutes. Please use this to verify your mobile number`
    await this.smsClient.sendSms(mobileNumber, message)
  }

  async verifyOtp(key: string, keyType: OtpType, otp: string) {
    let otpEntry
    if (keyType === OtpType.Email) {
      otpEntry = await this.otpRepository.findOne({ where: { email: key } })
    } else {
      otpEntry = await this.otpRepository.findOne({
        where: { mobileNumber: key },
      })
    }

    if (!otpEntry?.hashedOtp) {
      // TODO: Change to use AuthError after FE fix
      throw new BadRequestError("Hashed OTP not found")
    }

    if (
      otpEntry.attempts !== null &&
      otpEntry.attempts >= PARSED_MAX_NUM_OTP_ATTEMPTS
    ) {
      // TODO: Change to use AuthError after FE fix
      throw new BadRequestError("Max number of attempts reached")
    }

    // increment attempts
    await otpEntry.update({ attempts: otpEntry.attempts + 1 })

    const isValidOtp = await this.otpService.verifyOtp(otp, otpEntry.hashedOtp)
    if (!isValidOtp) {
      // TODO: Change to use AuthError after FE fix
      return new BadRequestError("OTP is not valid")
    }

    return true
  }

  private getOtpExpiry() {
    return new Date(Date.now() + PARSED_EXPIRY)
  }

  private async createOtpEntry(
    key: string,
    keyType: OtpType,
    hashedOtp: string
  ) {
    if (keyType === OtpType.Email) {
      await this.otpRepository.create({
        email: key,
        hashedOtp,
        expiresAt: this.getOtpExpiry(),
      })
    } else {
      await this.otpRepository.create({
        mobileNumber: key,
        hashedOtp,
        expiresAt: this.getOtpExpiry(),
      })
    }
  }
}

export default UsersService
