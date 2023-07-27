import autoBind from "auto-bind"
import express from "express"
import { errAsync, okAsync, ResultAsync } from "neverthrow"

import { config } from "@config/config"

import logger from "@logger/logger"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { AuthError } from "@root/errors/AuthError"
import DatabaseError from "@root/errors/DatabaseError"
import {
  SgidCreateRedirectUrlError,
  SgidFetchAccessTokenError,
  SgidFetchUserInfoError,
} from "@root/errors/SgidErrors"
import { RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto/error"
import { isSecure } from "@root/utils/auth-utils"
import { generateUuid } from "@root/utils/crypto-utils"
import UsersService from "@services/identity/UsersService"
import SgidAuthService from "@services/utilServices/SgidAuthService"

const FRONTEND_URL = config.get("app.frontendUrl")
const SGID_COOKIE_NAME = "isomer-sgid"

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
    // Generate a unique identifier for the request
    const sessionId = generateUuid()

    this.sgidAuthService
      .createSgidRedirectUrl(sessionId)
      .map((url) => {
        const cookieSettings = {
          httpOnly: true,
          secure: isSecure,
        }
        res
          .cookie(SGID_COOKIE_NAME, { sessionId }, cookieSettings)
          .json({ redirectUrl: url })
      })
      .mapErr((err) => {
        if (
          err instanceof SgidCreateRedirectUrlError ||
          err instanceof DatabaseError
        ) {
          return res.status(500).json({ message: err.message })
        }
        return res.status(500).json({ message: err })
      })
  }

  handleSgidLogin: RequestHandler<
    never,
    void | ResponseErrorBody,
    never,
    { code: string; state: string },
    never
  > = async (req, res) => {
    // Retrieve the authorization code and session ID
    const authCode = String(req.query.code)
    const sessionId = String(req.cookies[SGID_COOKIE_NAME].sessionId)

    let loginStatusCode = "500"

    // Exchange the authorization code and code verifier for the access token, then use the access token to retrieve user's email
    await this.sgidAuthService
      .retrieveSgidAccessToken(authCode, sessionId)
      .andThen(({ accessToken, sub }) =>
        // We can immediately process the access token - we only need to retrieve the email from sgid
        this.sgidAuthService.retrieveSgidUserEmail(accessToken, sub)
      )
      .andThen((email) => {
        if (!email)
          return errAsync(
            new AuthError(
              "Your email has not been whitelisted to use sgID login. Please use another method of login."
            )
          )
        return okAsync(email)
      })
      .andThen((email) =>
        // Login with email
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
        loginStatusCode = "200"
      })
      .mapErr((err) => {
        if (
          err instanceof SgidFetchAccessTokenError ||
          err instanceof SgidFetchUserInfoError ||
          err instanceof DatabaseError
        ) {
          loginStatusCode = "500"
        } else if (err instanceof AuthError) {
          loginStatusCode = "401"
        } else {
          loginStatusCode = "500"
        }
      })

    return res.redirect(`${FRONTEND_URL}/ogp-login?status=${loginStatusCode}`)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/auth-url",
      attachReadRouteHandlerWrapper(this.createSgidRedirectUrl)
    )
    router.get(
      "/auth-redirect",
      attachReadRouteHandlerWrapper(this.handleSgidLogin)
    )

    return router
  }
}
