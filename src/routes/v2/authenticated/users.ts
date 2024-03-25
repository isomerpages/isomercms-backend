import autoBind from "auto-bind"
import express from "express"
import { ResultAsync } from "neverthrow"
import validator from "validator"

import baseLogger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserSessionData from "@classes/UserSessionData"

import DatabaseError from "@root/errors/DatabaseError"
import { isError, RequestHandler } from "@root/types"
import {
  VerifyEmailOtpSchema,
  VerifyMobileNumberOtpSchema,
} from "@root/validators/RequestSchema"
import UsersService from "@services/identity/UsersService"

const logger = baseLogger.child({ module: "users" })

interface UsersRouterProps {
  usersService: UsersService
}

// eslint-disable-next-line import/prefer-default-export
export class UsersRouter {
  private readonly usersService

  constructor({ usersService }: UsersRouterProps) {
    this.usersService = usersService
    autoBind(this)
  }

  sendEmailOtp: RequestHandler<never, unknown, { email?: string }> = async (
    req,
    res
  ) => {
    const { email } = req.body
    if (!email || !validator.isEmail(email)) {
      throw new BadRequestError("Please provide a valid email")
    }

    try {
      const isValidEmail = await this.usersService.canSendEmailOtp(email)
      if (!isValidEmail) {
        throw new Error(
          `The email you have entered is not a government-issued email. Please contact your website owner for assistance.`
        )
      }
      await this.usersService.sendEmailOtp(email)
      return res.sendStatus(200)
    } catch (err) {
      logger.error(err, {
        params: {
          email,
        },
      })
      throw new BadRequestError(err.message)
    }
  }

  verifyEmailOtp: RequestHandler<
    never,
    unknown,
    { email: string; otp: string },
    never,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    const { email, otp } = req.body
    const { error } = VerifyEmailOtpSchema.validate(req.body)
    if (error)
      return res.status(400).json({
        message: `Invalid request format: ${error.message}`,
      })
    const { userSessionData } = res.locals
    const userId = userSessionData.isomerUserId
    const parsedEmail = email.toLowerCase()

    return this.usersService
      .verifyEmailOtp(parsedEmail, otp)
      .andThen(() =>
        ResultAsync.fromPromise(
          this.usersService.updateUserByIsomerId(userId, {
            email: parsedEmail,
          }),
          (err) => {
            logger.error(err, {
              params: { email, otp, isomerUserId: userId },
            })
            return new DatabaseError(
              "An error occurred when updating the database"
            )
          }
        )
      )
      .map(() => res.sendStatus(200))
      .mapErr((error) => {
        if (error instanceof BadRequestError) {
          return res.status(400).json({ message: error.message })
        }
        return res.status(500).json({ message: error.message })
      })
  }

  sendMobileNumberOtp: RequestHandler<
    never,
    unknown,
    { mobile?: string }
  > = async (req, res) => {
    const { mobile } = req.body
    if (!mobile || !validator.isMobilePhone(mobile)) {
      throw new BadRequestError("Please provide a valid mobile number")
    }

    await this.usersService.sendSmsOtp(mobile)
    return res.sendStatus(200)
  }

  verifyMobileNumberOtp: RequestHandler<
    never,
    unknown,
    { mobile: string; otp: string },
    never,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    const { mobile, otp } = req.body
    const { error } = VerifyMobileNumberOtpSchema.validate(req.body)
    if (error)
      return res.status(400).json({
        message: `Invalid request format: ${error.message}`,
      })
    if (!mobile || !validator.isMobilePhone(mobile)) {
      throw new BadRequestError("Please provide a valid mobile number")
    }
    const { userSessionData } = res.locals
    const userId = userSessionData.isomerUserId

    return this.usersService
      .verifyMobileOtp(mobile, otp)
      .andThen(() =>
        ResultAsync.fromPromise(
          this.usersService.updateUserByIsomerId(userId, {
            contactNumber: mobile,
          }),
          (err) => {
            logger.error(err, {
              params: {
                isomerUserId: userId,
                mobile,
              },
            })
            return new DatabaseError(
              "An error occurred when updating the database"
            )
          }
        )
      )
      .map(() => res.sendStatus(200))
      .mapErr((err) => {
        if (err instanceof BadRequestError) {
          return res.status(400).json({ message: err.message })
        }
        return res.status(500).json({ message: err.message })
      })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/email/otp", attachReadRouteHandlerWrapper(this.sendEmailOtp))
    router.post(
      "/email/verifyOtp",
      attachReadRouteHandlerWrapper(this.verifyEmailOtp)
    )
    router.post(
      "/mobile/otp",
      attachReadRouteHandlerWrapper(this.sendMobileNumberOtp)
    )
    router.post(
      "/mobile/verifyOtp",
      attachReadRouteHandlerWrapper(this.verifyMobileNumberOtp)
    )

    return router
  }
}
