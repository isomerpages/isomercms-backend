import { ResultAsync, errAsync, okAsync } from "neverthrow"
import { Op, ModelStatic, Transaction, QueryTypes } from "sequelize"
import { Sequelize } from "sequelize-typescript"
import { RequireAtLeastOne } from "type-fest"

import { config } from "@config/config"

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
    const normalizedEmail = email.toLowerCase()

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
    const records = (await this.sequelize.query(
      `
        SELECT email
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
    )) as { email: string }[]

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

  private verifyOtp(
    otpEntry: Otp | null,
    otp: string,
    transaction: Transaction
  ) {
    // TODO: Change all the following to use AuthError after FE fix
    return okAsync(otp)
      .andThen((otp) => {
        if (!otp) {
          return errAsync(new BadRequestError("Empty OTP provided"))
        }

        return okAsync(otp)
      })
      .andThen(() => {
        if (!otpEntry) {
          return errAsync(new BadRequestError("OTP not found"))
        }

        return okAsync(otpEntry)
      })
      .andThen((otpDbEntry) => {
        if (otpDbEntry.attempts >= MAX_NUM_OTP_ATTEMPTS) {
          return errAsync(new BadRequestError("Max number of attempts reached"))
        }

        return okAsync(otpDbEntry)
      })
      .andThen((otpDbEntry) => {
        if (!otpDbEntry.hashedOtp) {
          return ResultAsync.fromPromise(
            otpDbEntry.destroy({ transaction }),
            (error) => {
              logger.error(
                `Error destroying OTP entry: ${JSON.stringify(error)}`
              )

              return new DatabaseError("Error destroying OTP entry in database")
            }
          ).andThen(() => errAsync(new BadRequestError("Hashed OTP not found")))
        }

        return okAsync(otpDbEntry)
      })
      .andThen((otpDbEntry) =>
        // increment attempts
        ResultAsync.fromPromise(
          this.otpRepository.increment("attempts", {
            where: { id: otpDbEntry.id },
            transaction,
          }),
          (error) => {
            logger.error(
              `Error incrementing OTP attempts: ${JSON.stringify(error)}`
            )

            return new DatabaseError("Error incrementing OTP attempts")
          }
        ).map(() => otpDbEntry)
      )
      .andThen((otpDbEntry) =>
        ResultAsync.combine([
          okAsync(otpDbEntry),
          ResultAsync.fromPromise(
            this.otpService.verifyOtp(otp, otpDbEntry.hashedOtp),
            (error) => {
              logger.error(`Error verifying OTP: ${JSON.stringify(error)}`)

              return new BadRequestError("Error verifying OTP")
            }
          ),
        ])
      )
      .andThen(([otpDbEntry, isValidOtp]) => {
        if (!isValidOtp) {
          return errAsync(new BadRequestError("OTP is not valid"))
        }

        if (isValidOtp && otpDbEntry.expiresAt < new Date()) {
          return ResultAsync.fromPromise(
            otpDbEntry.destroy({ transaction }),
            (error) => {
              logger.error(
                `Error destroying OTP entry: ${JSON.stringify(error)}`
              )

              return new DatabaseError("Error destroying OTP entry in database")
            }
          ).andThen(() => errAsync(new BadRequestError("OTP has expired")))
        }

        return okAsync(otpDbEntry)
      })
      .andThen((otpDbEntry) =>
        // destroy otp before returning true since otp has been "used"
        ResultAsync.fromPromise(
          otpDbEntry.destroy({ transaction }),
          (error) => {
            logger.error(`Error destroying OTP entry: ${JSON.stringify(error)}`)

            return new DatabaseError("Error destroying OTP entry in database")
          }
        )
          .andThen(() =>
            ResultAsync.fromPromise(transaction.commit(), (txError) => {
              logger.error(
                `Error committing transaction: ${JSON.stringify(txError)}`
              )
              return new DatabaseError("Error committing transaction")
            })
          )
          .map(() => true)
      )
      .orElse((error) =>
        ResultAsync.fromPromise(transaction.commit(), (txError) => {
          logger.error(
            `Error committing transaction: ${JSON.stringify(txError)}`
          )
          return new DatabaseError("Error committing transaction")
        }).andThen(() => errAsync(error))
      )
  }

  verifyEmailOtp(email: string, otp: string) {
    const parsedEmail = email.toLowerCase()

    return ResultAsync.fromPromise(this.sequelize.transaction(), (error) => {
      logger.error(
        `Error starting database transaction: ${JSON.stringify(error)}`
      )

      return new BadRequestError("Error starting database transaction")
    })
      .andThen((transaction) =>
        ResultAsync.combine([
          ResultAsync.fromPromise(
            this.otpRepository.findOne({
              where: { email: parsedEmail },
              lock: true,
              transaction,
            }),
            (error) => {
              logger.error(
                `Error finding OTP entry when verifying email OTP: ${JSON.stringify(
                  error
                )}`
              )

              return new BadRequestError(
                "Error finding OTP entry when verifying email OTP"
              )
            }
          ),
          okAsync(transaction),
        ])
      )
      .andThen(([otpEntry, transaction]) =>
        this.verifyOtp(otpEntry, otp, transaction)
      )
  }

  verifyMobileOtp(mobileNumber: string, otp: string) {
    return ResultAsync.fromPromise(this.sequelize.transaction(), (error) => {
      logger.error(
        `Error starting database transaction: ${JSON.stringify(error)}`
      )

      return new BadRequestError("Error starting database transaction")
    })
      .andThen((transaction) =>
        ResultAsync.combine([
          ResultAsync.fromPromise(
            this.otpRepository.findOne({
              where: { mobileNumber },
              lock: true,
              transaction,
            }),
            (error) => {
              logger.error(
                `Error finding OTP entry when verifying mobile OTP: ${JSON.stringify(
                  error
                )}`
              )

              return new BadRequestError(
                "Error finding OTP entry when verifying mobile OTP"
              )
            }
          ),
          okAsync(transaction),
        ])
      )
      .andThen(([otpEntry, transaction]) =>
        this.verifyOtp(otpEntry, otp, transaction)
      )
  }

  private getOtpExpiry() {
    return new Date(Date.now() + OTP_EXPIRY)
  }
}

export default UsersService
