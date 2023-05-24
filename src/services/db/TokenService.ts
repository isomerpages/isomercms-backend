import { AxiosRequestConfig, AxiosResponse, AxiosInstance } from "axios"
import {
  Result,
  ok,
  err,
  ResultAsync,
  okAsync,
  errAsync,
  fromPromise,
} from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import DatabaseError from "@errors/DatabaseError"
import NoAvailableTokenError from "@errors/NoAvailableTokenError"
import TokenParsingError from "@errors/TokenParsingError"

import tracer from "@utils/tracer"

import { AccessToken } from "@database/models"

// Env vars
const GITHUB_TOKEN_LIMIT = 5000
const GITHUB_TOKEN_THRESHOLD = 4000
const GITHUB_RESET_INTERVAL = 60 * 60 // seconds
const ACTIVE_TOKEN_ALERT_1 = 0.6
const ACTIVE_TOKEN_ALERT_2 = 0.8

type MaybeResetTime = Result<number, null>
const NoResetTime: MaybeResetTime = err(null)

type TokenData = {
  id: number

  tokenString: string

  remainingRequests: number

  resetTime: MaybeResetTime
}

const NoTokenData = null
type MaybeTokenData = TokenData | typeof NoTokenData

type ResponseTokenData = {
  token: string
  remainingRequests: number
  resetTime: number
}

class TokenService {
  private activeTokensData: TokenData[] = []

  private reservedTokenData: MaybeTokenData = NoTokenData

  private useReservedTokens = false

  private static readonly tokenDB: ModelStatic<AccessToken> = AccessToken

  constructor(axiosInstances: AxiosInstance[]) {
    this.setUpTokens()
    axiosInstances.forEach((axiosInstance) => {
      axiosInstance.interceptors.request.use(this.requestFormatter)
      axiosInstance.interceptors.response.use(this.responseHandler)
    })
  }

  setUpTokens(): ResultAsync<void, DatabaseError> {
    return fromPromise(
      TokenService.tokenDB.findAll({
        where: {
          isReserved: false,
        },
      }),

      (error) =>
        new DatabaseError("Unable to retrieve active tokens from database")
    ).map((activeTokens) => {
      activeTokens.forEach((activeToken) => {
        this.activeTokensData.push({
          id: activeToken.id,
          tokenString: activeToken.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NoResetTime,
        })
      })
    })
  }

  requestFormatter = async (
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig> => {
    logger.info("Making GitHub API call")

    const authMessage = config.headers?.Authorization

    // If accessToken is missing, authMessage is `token `
    // NOTE: This also implies that the user has not provided
    // their own github token and hence, are email login users.
    const isEmailLoginUser =
      !authMessage ||
      authMessage === "token " ||
      authMessage === "token undefined"

    if (isEmailLoginUser) {
      const accessToken = await this.selectToken()
        .map((token) => token.tokenString)
        .unwrapOr("null")
      if (config.headers) {
        config.headers.Authorization = `token ${accessToken}`
      }
      tracer.use("http", {
        hooks: {
          request: (span, req, res) => {
            span?.setTag("user.type", "email")
          },
        },
      })
      logger.info(`Email login user made call to Github API: ${config.url}`)
    } else {
      tracer.use("http", {
        hooks: {
          request: (span, req, res) => {
            span?.setTag("user.type", "github")
          },
        },
      })
      logger.info(`Github login user made call to Github API: ${config.url}`)
    }
    return {
      ...config,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    }
  }

  responseHandler = async (response: AxiosResponse): Promise<AxiosResponse> => {
    // Any status code that lie within the range of 2xx will cause this function to trigger

    TokenService.parseResponseTokenData(response).map((tokenData) => {
      this.updateTokens(
        tokenData.token,
        tokenData.remainingRequests,
        tokenData.resetTime
      )
    })
    this.activeUsageAlert()
    return response
  }

  activeUsageAlert() {
    let exhaustedTokensCount = 0
    this.activeTokensData.forEach((tokenData) => {
      if (
        tokenData.remainingRequests <=
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      ) {
        exhaustedTokensCount += 1
      }
    })
    if (
      exhaustedTokensCount >=
      this.activeTokensData.length * ACTIVE_TOKEN_ALERT_2
    ) {
      logger.info(`${ACTIVE_TOKEN_ALERT_2}% of access token capacity reached`)
      logger.info(
        `${exhaustedTokensCount}/${this.activeTokensData.length} active tokens exhausted`
      )
    } else if (
      exhaustedTokensCount >=
      this.activeTokensData.length * ACTIVE_TOKEN_ALERT_1
    ) {
      logger.info(`${ACTIVE_TOKEN_ALERT_1}% of access token capacity reached`)
      logger.info(
        `${exhaustedTokensCount}/${this.activeTokensData.length} active tokens exhausted`
      )
    }
  }

  static parseResponseTokenData(
    response: AxiosResponse
  ): Result<ResponseTokenData, TokenParsingError> {
    // response.config.headers.Authorization format: token ghp_********************************
    if (
      typeof response.config?.headers?.Authorization !== "string" ||
      response.config?.headers?.Authorization.length !== 46 ||
      response.config?.headers?.Authorization.slice(0, 6) !== "token " ||
      Number.isNaN(+response.headers?.["x-ratelimit-remaining"]) ||
      Number.isNaN(+response.headers?.["x-ratelimit-reset"])
    ) {
      return err(new TokenParsingError(response))
    }
    const token: string = response.config.headers.Authorization.slice(6)

    const remainingRequests = +response.headers["x-ratelimit-remaining"]
    const resetTime = +response.headers["x-ratelimit-reset"]
    return ok({ token, remainingRequests, resetTime })
  }

  updateTokens(token: string, remainingRequests: number, resetTime: number) {
    this.activeTokensData.forEach((activeTokenData) => {
      if (activeTokenData.tokenString === token) {
        activeTokenData.remainingRequests = remainingRequests
        activeTokenData.resetTime = ok(resetTime)
      }
    })
    if (this.reservedTokenData?.tokenString === token) {
      this.reservedTokenData.remainingRequests = remainingRequests
      this.reservedTokenData.resetTime = ok(resetTime)
    }
  }

  selectToken(): ResultAsync<TokenData, NoAvailableTokenError | DatabaseError> {
    if (this.useReservedTokens === false) {
      const activeToken = this.selectActiveToken()
      if (activeToken !== NoTokenData) {
        return okAsync(activeToken)
      }
      logger.info("active tokens capacity reached")
      logger.info("switching to using reserved tokens")
      this.useReservedTokens = true
      setTimeout(() => {
        this.useReservedTokens = false
      }, GITHUB_RESET_INTERVAL * 1000) // 1 hour timeout
    }
    return this.selectReservedToken().andThen((reservedToken) => {
      if (reservedToken !== NoTokenData) {
        return okAsync(reservedToken)
      }
      logger.info("reserved tokens capacity reached")
      return errAsync(new NoAvailableTokenError())
    })
  }

  selectActiveToken(): MaybeTokenData {
    let token: MaybeTokenData = NoTokenData
    const earliestResetTime: MaybeResetTime = NoResetTime
    const now: Date = new Date()
    const nowEpochSecondsUTC: number =
      now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000
    this.activeTokensData.forEach((activeTokenData) => {
      // Set reset time to null if time has past
      if (
        activeTokenData.resetTime.unwrapOr(Number.MAX_VALUE) <
        nowEpochSecondsUTC
      ) {
        activeTokenData.resetTime = NoResetTime
      }
      // Choose earliest non-null reset time from tokens that has not exceeded  threshold
      if (
        activeTokenData.remainingRequests >
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      ) {
        if (activeTokenData.resetTime.isErr()) {
          if (earliestResetTime.isErr()) {
            token = activeTokenData
          }
        } else if (
          earliestResetTime.isErr() ||
          activeTokenData.resetTime.value < earliestResetTime.value
        ) {
          token = activeTokenData
        }
      }
    })
    return token
  }

  selectReservedToken(): ResultAsync<MaybeTokenData, DatabaseError> {
    if (
      this.reservedTokenData === NoTokenData ||
      this.reservedTokenData.remainingRequests >
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
    ) {
      return this.sourceReservedToken().andThen(() =>
        okAsync(this.reservedTokenData)
      )
    }
    return okAsync(this.reservedTokenData)
  }

  sourceReservedToken(): ResultAsync<void, DatabaseError> {
    return fromPromise(
      TokenService.tokenDB.findOne({
        where: {
          isReserved: true,
          resetTime: null,
        },
      }),
      (error) =>
        new DatabaseError("Unable to retrieve reserved tokens from database")
    ).map((reservedToken) => {
      if (reservedToken !== null) {
        this.reservedTokenData = {
          id: reservedToken.id,
          tokenString: reservedToken.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NoResetTime,
        }
        const resetTime = new Date()
        resetTime.setSeconds(resetTime.getSeconds() + GITHUB_RESET_INTERVAL)
        reservedToken.resetTime = resetTime
        reservedToken.save()

        // set reset time to null after reset time
        setTimeout(() => {
          reservedToken.resetTime = null
          reservedToken.save()
        }, GITHUB_RESET_INTERVAL * 1000)
      }
    })
  }
}

export { TokenService }
