import autoBind from "auto-bind"
import express from "express"
import { ResultAsync } from "neverthrow"
import validator from "validator"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserSessionData from "@classes/UserSessionData"

import DatabaseError from "@root/errors/DatabaseError"
import { isError, RequestHandler } from "@root/types"
import UsersService from "@services/identity/UsersService"

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
      if (isError(err)) {
        logger.error(err.message)
        throw new BadRequestError(err.message)
      } else {
        // If we encountered something that isn't an error but still ends up in the error branch,
        // log this to cloudwatch with the relevant details
        logger.error(
          `Encountered unknown error type: ${err} when sendEmailOtp with email: ${email}`
        )
      }
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
          (error) => {
            logger.error(
              `Error updating user email by Isomer ID: ${JSON.stringify(error)}`
            )
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
    const { userSessionData } = res.locals
    const userId = userSessionData.isomerUserId

    return this.usersService
      .verifyMobileOtp(mobile, otp)
      .andThen(() =>
        ResultAsync.fromPromise(
          this.usersService.updateUserByIsomerId(userId, {
            contactNumber: mobile,
          }),
          (error) => {
            logger.error(
              `Error updating user contact number by Isomer ID: ${JSON.stringify(
                error
              )}`
            )
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
