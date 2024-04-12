import { ResultAsync, errAsync } from "neverthrow"
import { Op, ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"
import { RequireAtLeastOne } from "type-fest"

import { config } from "@config/config"

import { BaseIsomerError } from "@errors/BaseError"

import { Otp, Repo, Site, User, Whitelist, SiteMember } from "@database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import DatabaseError from "@root/errors/DatabaseError"
import logger from "@root/logger/logger"
import { milliSecondsToMinutes } from "@root/utils/time-utils"
import SmsClient from "@services/identity/SmsClient"
import MailClient from "@services/utilServices/MailClient"

import OtpService from "./OtpService"

const OTP_EXPIRY = config.get("auth.otpExpiry")
const MAX_NUM_OTP_ATTEMPTS = config.get("auth.maxNumOtpAttempts")

enum OtpType {
  Email = "EMAIL",
  Mobile = "MOBILE",
}

type Class<T> = new (...args: any[]) => T

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
    const parsedEmail = email.toLowerCase()
    return this.repository.findOne({ where: { email: parsedEmail } })
  }

  async findByGitHubId(githubId: string) {
    return this.repository.findOne({ where: { githubId } })
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

  async findOrCreateByEmail(email: string) {
    const parsedEmail = email.toLowerCase()
    const [user] = await this.repository.findOrCreate({
      where: { email: parsedEmail },
    })
    return user
  }

  async login(githubId: string): Promise<User> {
    const [user] = await this.repository.upsert({
      githubId,
      lastLoggedIn: new Date(),
    })

    return user
  }

  async loginWithEmail(email: string): Promise<User> {
    const [user] = await this.repository.upsert({
      email: email.toLowerCase(),
      lastLoggedIn: new Date(),
    })

    return user
  }

  async canSendEmailOtp(email: string) {
    const parsedEmail = email.toLowerCase()
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
      whitelistDomains.filter((domain) => parsedEmail.endsWith(domain)).length >
      0
    return hasMatchDomain
  }

  async sendEmailOtp(email: string) {
    const normalizedEmail = email.toLowerCase()
    const { otp, hashedOtp } = await this.otpService.generateLoginOtpWithHash()

    // Reset attempts to login
    await this.otpRepository.upsert({
      email: normalizedEmail,
      hashedOtp,
      attempts: 0,
      expiresAt: this.getOtpExpiry(),
    })

    const subject = "One-Time Password (OTP) for IsomerCMS"
    const html = `<p>Your OTP is <b>${otp}</b>. It will expire in ${milliSecondsToMinutes(
      OTP_EXPIRY
    )} minutes. Please use this to verify your email address.</p>
    <p>If your OTP does not work, please request for a new OTP.</p>
    <p>IsomerCMS Support Team</p>`
    await this.mailer.sendMail(normalizedEmail, subject, html)
  }

  async sendSmsOtp(mobileNumber: string) {
    const { otp, hashedOtp } = await this.otpService.generateLoginOtpWithHash()

    // Reset attempts to login
    await this.otpRepository.upsert({
      mobileNumber,
      hashedOtp,
      attempts: 0,
      expiresAt: this.getOtpExpiry(),
    })

    const message = `Your OTP is ${otp}. It will expire in ${milliSecondsToMinutes(
      OTP_EXPIRY
    )} minutes. Please use this to verify your mobile number`
    await this.smsClient.sendSms(mobileNumber, message)
  }

  private otpGetAndLogError<T extends BaseIsomerError>(
    ErrorClass: Class<T>,
    cause: unknown,
    message: string
  ): T {
    logger.error({
      error: cause,
      message,
    })

    return new ErrorClass(message)
  }

  private otpDestroyEntry(otpEntry: Otp) {
    return ResultAsync.fromPromise(otpEntry.destroy(), (error) =>
      this.otpGetAndLogError(DatabaseError, error, `Error destroying OTP entry`)
    )
  }

  private verifyOtp({
    otp,
    findConditions,
    findErrorMessage,
  }: {
    otp: string | undefined
    findConditions: { email: string } | { mobileNumber: string }
    findErrorMessage: string
  }) {
    if (!otp) {
      return errAsync(new BadRequestError("Empty OTP provided"))
    }

    // local variables that can be referenced for convenience, instead of having the steps of the promise chain carry them each
    //  time with AsyncResult.combine() wrappers (which makes the code har to read)
    let otpEntry: Otp | null = null

    // TypeScript can't tell when otpEntry is guaranteed to not be null in the promise chain steps
    // So we'll provide non-null assertions ourselves, and we need to tell eslint to leave us alone -_-
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    return ResultAsync.fromPromise(
      this.otpRepository.findOne({
        where: findConditions,
      }),
      (error) => this.otpGetAndLogError(DatabaseError, error, findErrorMessage)
    )
      .andThen((_otpEntry: Otp | null) => {
        otpEntry = _otpEntry // store otpEntry in outer scope, so it's easier to access it in the local promise chain steps

        // verify that otpDbEntry exists
        if (!otpEntry) {
          return errAsync(new BadRequestError("OTP not found"))
        }

        // after this point, otpEntry is guaranteed to be truthy is all promise chain steps

        // verify otpEntry validity

        if (otpEntry.expiresAt < new Date()) {
          return this.otpDestroyEntry(otpEntry!).andThen(() =>
            errAsync(new BadRequestError("OTP has expired"))
          )
        }

        if (otpEntry.attempts >= MAX_NUM_OTP_ATTEMPTS) {
          // should this delete the otpEntry as well?
          return errAsync(new BadRequestError("Max number of attempts reached"))
        }

        if (!otpEntry.hashedOtp) {
          return this.otpDestroyEntry(otpEntry).andThen(() =>
            errAsync(new BadRequestError("Hashed OTP not found"))
          )
        }

        return ResultAsync.fromPromise(
          this.otpRepository.increment("attempts", {
            where: { id: otpEntry.id },
          }),
          (error) =>
            this.otpGetAndLogError(
              DatabaseError,
              error,
              "Error incrementing OTP attempts"
            )
        )
      })
      .andThen(() =>
        ResultAsync.fromPromise(
          this.otpService.verifyOtp(otp, otpEntry!.hashedOtp),
          (error) =>
            this.otpGetAndLogError(
              BadRequestError,
              error,
              "Error verifying OTP"
            )
        )
      )
      .andThen((isValidOtp) => {
        if (!isValidOtp) {
          return errAsync(new BadRequestError("OTP is not valid"))
        }

        // destroy otp before returning true since otp has been "used"
        return this.otpDestroyEntry(otpEntry!)
      })
      .map(() => true)

    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  }

  verifyEmailOtp(email: string, otp: string | undefined) {
    const normalizedEmail = email.toLowerCase()

    return this.verifyOtp({
      otp,
      findConditions: { email: normalizedEmail },
      findErrorMessage: "Error finding OTP entry when verifying email OTP",
    })
  }

  verifyMobileOtp(mobileNumber: string, otp: string | undefined) {
    return this.verifyOtp({
      otp,
      findConditions: { mobileNumber },
      findErrorMessage: "Error finding OTP entry when verifying mobile OTP",
    })
  }

  private getOtpExpiry() {
    return new Date(Date.now() + OTP_EXPIRY)
  }
}

export default UsersService
