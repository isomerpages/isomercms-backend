import autoBind from "auto-bind"
import express from "express"
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow"

import logger from "@logger/logger"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import jwtUtils from "@utils/jwt-utils"

import { AuthError } from "@root/errors/AuthError"
import DatabaseError from "@root/errors/DatabaseError"
import {
  SgidCreateRedirectUrlError,
  SgidFetchAccessTokenError,
  SgidFetchUserInfoError,
  SgidVerifyUserError,
} from "@root/errors/SgidError"
import { RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto/error"
import { isPublicOfficerData, PublicOfficerData } from "@root/types/sgid"
import { isSecure } from "@root/utils/auth-utils"
import UsersService from "@services/identity/UsersService"
import SgidAuthService from "@services/utilServices/SgidAuthService"

const SGID_COOKIE_NAME = "isomer-sgid"
const SGID_MULTIUSER_COOKIE_NAME = "isomer-multiuser-sgid"
const CSRF_TOKEN_EXPIRY_MS = 600000

interface SgidAuthRouterProps {
  usersService: UsersService
  sgidAuthService: SgidAuthService
}

// eslint-disable-next-line import/prefer-default-export
export class SgidAuthRouter {
  private readonly usersService

  private readonly sgidAuthService

  constructor({ usersService, sgidAuthService }: SgidAuthRouterProps) {
    this.usersService = usersService
    this.sgidAuthService = sgidAuthService
    autoBind(this)
  }

  createSgidRedirectUrl: RequestHandler<
    never,
    { redirectUrl: string } | ResponseErrorBody,
    never,
    never,
    never
  > = async (req, res) => {
    this.sgidAuthService
      .createSgidRedirectUrl()
      .map(({ cookieData, url }) => {
        const cookieSettings = {
          httpOnly: true,
          secure: isSecure,
          sameSite: "strict" as const,
        }
        res
          .cookie(SGID_COOKIE_NAME, cookieData, cookieSettings)
          .json({ redirectUrl: url })
      })
      .mapErr((err) => {
        if (err instanceof SgidCreateRedirectUrlError) {
          return res.status(500).json({ message: err.message })
        }
        return res.status(500).json({ message: err })
      })
  }

  handleSgidLogin: RequestHandler<
    never,
    { userData: PublicOfficerData[] } | ResponseErrorBody,
    never,
    { code: string; state: string },
    never
  > = async (req, res) => {
    // Retrieve the authorization code and session ID
    const authCode = String(req.query.code)

    const cookieData = req.cookies[SGID_COOKIE_NAME]

    if (!cookieData || !cookieData.nonce || !cookieData.codeVerifier) {
      logger.error("Invalid cookie provided for sgid login")
      return res.status(500).send()
    }

    const { nonce, codeVerifier } = cookieData

    // Exchange the authorization code and code verifier for the access token, then use the access token to retrieve user's data
    const userDataRes = await this.sgidAuthService
      .retrieveSgidAccessToken({ authCode, nonce, codeVerifier })
      .andThen(({ accessToken, sub }) =>
        // We can immediately process the access token - we only need to retrieve the email from sgid
        this.sgidAuthService.retrieveSgidUserData(accessToken, sub)
      )
      .andThen((officerDetails) => {
        if (!officerDetails || officerDetails.length === 0) {
          return errAsync(
            new AuthError(
              "Your email has not been whitelisted to use sgID login. Please use another method of login."
            )
          )
        }
        return okAsync(officerDetails)
      })
    if (userDataRes.isErr()) {
      const { error } = userDataRes
      if (
        error instanceof SgidFetchAccessTokenError ||
        error instanceof SgidFetchUserInfoError
      ) {
        return res.status(500).send()
      }
      if (error instanceof AuthError) {
        return res.status(401).send()
      }
      return res.status(500).send()
    }

    const userData = userDataRes.value
    if (userData.length === 1) {
      // If user only has a single email, login directly
      await ResultAsync.fromPromise(
        this.usersService.loginWithEmail(userData[0].email),
        (error) => {
          logger.error(
            `Error while retrieving user info from database: ${error}`
          )
          return new DatabaseError()
        }
      )
        .map((user) => {
          const userInfo = {
            isomerUserId: user.id,
            email: user.email,
          }
          Object.assign(req.session, { userInfo })
          return res.status(200).send({ userData })
        })
        .mapErr((error) => res.status(500).send())
    } else {
      // User has multiple emails, defer to user to select email
      const csrfTokenExpiry = new Date()
      // getTime allows this to work across timezones
      csrfTokenExpiry.setTime(csrfTokenExpiry.getTime() + CSRF_TOKEN_EXPIRY_MS)
      const cookieSettings = {
        expires: csrfTokenExpiry,
        httpOnly: true,
        secure: isSecure,
      }
      const token = jwtUtils.signToken({ userData })
      res.cookie(SGID_MULTIUSER_COOKIE_NAME, token, cookieSettings)
      return res.status(200).send({ userData })
    }
  }

  handleSgidMultiuserLogin: RequestHandler<
    never,
    void | ResponseErrorBody,
    { email: string },
    unknown,
    never
  > = async (req, res) => {
    const { email } = req.body
    const token = req.cookies[SGID_MULTIUSER_COOKIE_NAME]

    const safeVerify = Result.fromThrowable(jwtUtils.verifyToken, (error) => {
      logger.error(
        `Error - invalid token for sgid multiuser login ${email}: ${error}`
      )
      return new SgidVerifyUserError()
    })

    await safeVerify(token)
      .andThen((verifiedToken) => {
        if (
          verifiedToken &&
          typeof verifiedToken === "object" &&
          "userData" in verifiedToken
        ) {
          return ok(verifiedToken.userData)
        }
        logger.error(
          `Error - token does not match expected format for sgid multiuser login ${email}`
        )
        return err(new SgidVerifyUserError())
      })
      .andThen((userData) => {
        if (
          Array.isArray(userData) &&
          userData.every((item) => isPublicOfficerData(item))
        )
          return ok(userData as PublicOfficerData[])
        logger.error(
          `Error - token does not match expected format for sgid multiuser login ${email}`
        )
        return err(new SgidVerifyUserError())
      })
      .andThen((userData) => {
        const isValidUser =
          userData.filter((data) => data.email === email).length > 0
        if (!isValidUser) {
          logger.error(
            `Error - user with emails ${userData
              .map((data) => data.email)
              .join(", ")} attempting to login with unverified email ${email}`
          )
          return err(new SgidVerifyUserError())
        }
        return ok("")
      })
      .asyncAndThen(() =>
        ResultAsync.fromPromise(
          this.usersService.loginWithEmail(email),
          (error) => {
            logger.error(
              `Error while retrieving user info from database: ${error}`
            )
            return new DatabaseError()
          }
        )
      )
      .map((user) => {
        const userInfo = {
          isomerUserId: user.id,
          email: user.email,
        }
        Object.assign(req.session, { userInfo })
        return res.status(200).send()
      })
      .mapErr((error) => {
        if (error instanceof DatabaseError) return res.status(500).send()
        if (error instanceof SgidVerifyUserError) return res.status(401).send()
        return res.status(500).send()
      })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/auth-url",
      attachReadRouteHandlerWrapper(this.createSgidRedirectUrl)
    )
    router.get(
      "/verify-login",
      attachReadRouteHandlerWrapper(this.handleSgidLogin)
    )
    router.post(
      "/verify-multiuser-login",
      attachReadRouteHandlerWrapper(this.handleSgidMultiuserLogin)
    )

    return router
  }
}
