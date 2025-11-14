import { ResultAsync, errAsync } from "neverthrow"
import { Op, ModelStatic, QueryTypes } from "sequelize"
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

  async getWhitelistRecordsFromEmail(email: string) {
    // Raw query for readability because it uses 2 "unusual" query patterns
    // - a CASE WHEN in the WHERE clause
    // - a where condition of the form 'input like cell' (with a concat() call thrown in), as opposed to the more common 'cell like input'
    //
    // Why? We want to leverage the DB to see if a single record exists that whitelists the input
    // we do not want to download the whole table locally to filter in local code
    //
    // query logic:
    // - if whitelist entry is a full email (something before the @), then do exact match
    // - if whitelist entry is a domain (no @, or starting with @), then do suffix match
    //
    // Limit 1 is added to allow the query to exit early on first match
    const normalizedEmail = email.toLowerCase()
    const whitelist = (await this.sequelize.query(
      `
        SELECT email, expiry
        FROM whitelist
        WHERE
          (expiry is NULL OR expiry > NOW())
          AND
          CASE WHEN email ~ '^.+@'
            THEN email = :email
            ELSE :email LIKE CONCAT('%', email)
          END
        LIMIT 1
      `,
      {
        replacements: { email: normalizedEmail },
        type: QueryTypes.SELECT,
      }
    )) as { email: string; expiry: string }[]
    return whitelist
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
    const records = await this.getWhitelistRecordsFromEmail(email)

    if (records.length >= 1) {
      logger.info({
        message: "Email valid for OTP by whitelist",
        meta: {
          email,
          whitelistEntry: records[0].email,
        },
      })

      return true
    }

    return false
  }

  async sendEmailOtp(email: string) {
    const normalizedEmail = email.toLowerCase()

    // Check if there's already a valid OTP for this email
    // This prevents creating new OTPs while a valid one exists, mitigating
    // the attack vector where an attacker spam OTP requests
    // to prevent the user from logging in
    const existingOtp = await this.otpRepository.findOne({
      where: {
        email: normalizedEmail,
        hashedOtp: {
          [Op.regexp]: "\\S+", // at least one non-whitespace character (i.e. is truthy!)
        },
      },
    })
    if (existingOtp && existingOtp.expiresAt >= new Date()) {
      logger.info({
        message: "OTP request blocked: valid OTP already exists",
        meta: {
          email: normalizedEmail,
          expiresAt: existingOtp.expiresAt,
        },
      })
      // Return silently to avoid revealing whether an OTP exists
      // This maintains security by not leaking information about existing OTPs
      return
    }

    const { otp, hashedOtp } = await this.otpService.generateLoginOtpWithHash()

    // Reset attempts to login
    await this.otpRepository.upsert({
      email: normalizedEmail,
      hashedOtp,
      attempts: 0,
      attemptsByIp: {},
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
      attemptsByIp: {},
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
    clientIp = "unknown", // default to 'unknown' bucket when IP missing to ensure users are not locked out
  }: {
    otp: string | undefined
    findConditions: { email: string } | { mobileNumber: string }
    findErrorMessage: string
    clientIp?: string
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
        where: {
          ...findConditions,
          hashedOtp: {
            [Op.regexp]: "\\S+", // at least one non-whitespace character (i.e. is truthy!)
          },
        },
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

        // GTA-80-009 WP2: Enforce per-IP attempts;
        const attemptsByIp = otpEntry.attemptsByIp || {}
        const attemptsForIp = attemptsByIp[clientIp] ?? 0
        if (attemptsForIp >= MAX_NUM_OTP_ATTEMPTS) {
          // should this delete the otpEntry as well?
          return errAsync(new BadRequestError("Max number of attempts reached"))
        }

        // We must successfully be able to increment the otp record attempts before any processing, to prevent brute-force race condition
        // Consult GTA-24-012 WP3 for details
        // atomically increment attempts for this IP using JSONB concatenation guarded by current value
        const newAttemptsForIp = attemptsForIp + 1
        const attemptsByIpUpdated = { ...(otpEntry.attemptsByIp || {}) }
        attemptsByIpUpdated[clientIp] = newAttemptsForIp

        return ResultAsync.fromPromise(
          this.otpRepository.update(
            {
              // maintain legacy aggregate attempts for monitoring, but do not enforce with it
              attempts: otpEntry.attempts + 1,
              attemptsByIp: attemptsByIpUpdated,
            },
            {
              where: {
                id: otpEntry.id,
                attempts: otpEntry.attempts, // required to ensure the record has not been modified in parallel
              },
            }
          ),
          (error) =>
            this.otpGetAndLogError(
              DatabaseError,
              error,
              "Error incrementing OTP attempts"
            )
        )
      })
      .andThen(([numAffectedRows]) => {
        if (numAffectedRows <= 0) {
          // Record could not be updated. It was likely changed in parallel by another request, we must fail this verification attempt now
          return errAsync(
            new BadRequestError("Unable to increment OTP attempts")
          )
        }

        // Note/Warning: after this step, otpEntry.attempts does not have the value that is in DB (it is one less!)
        // It's OK because we no longer reference otpEntry.attempts in this flow.

        return ResultAsync.fromPromise(
          this.otpService.verifyOtp(otp, otpEntry!.hashedOtp),
          (error) =>
            this.otpGetAndLogError(
              BadRequestError,
              error,
              "Error verifying OTP"
            )
        )
      })
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

  verifyEmailOtp(email: string, otp: string | undefined, clientIp?: string) {
    const normalizedEmail = email.toLowerCase()

    return this.verifyOtp({
      otp,
      findConditions: { email: normalizedEmail },
      findErrorMessage: "Error finding OTP entry when verifying email OTP",
      clientIp,
    })
  }

  verifyMobileOtp(
    mobileNumber: string,
    otp: string | undefined,
    clientIp?: string
  ) {
    return this.verifyOtp({
      otp,
      findConditions: { mobileNumber },
      findErrorMessage: "Error finding OTP entry when verifying mobile OTP",
      clientIp,
    })
  }

  private getOtpExpiry() {
    return new Date(Date.now() + OTP_EXPIRY)
  }
}

export default UsersService
