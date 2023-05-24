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

type MaybeTokenData = Result<TokenData, null>
const NoTokenData: MaybeTokenData = err(null)

type ResponseTokenData = {
  token: string
  remainingRequests: number
  resetTime: number
}

const tokenDB: ModelStatic<AccessToken> = AccessToken

class TokenService {
  private activeTokensData: TokenData[] = []

  private reservedTokenData: MaybeTokenData = NoTokenData

  private useReservedTokens = false

  private initialized = false

  setUpTokens(): ResultAsync<void, DatabaseError> {
    return queryActiveTokens().map((activeTokensData) => {
      this.activeTokensData = activeTokensData
    })
  }

  getAccessToken(): ResultAsync<
    TokenData,
    NoAvailableTokenError | DatabaseError
  > {
    if (!this.initialized) {
      return this.setUpTokens().andThen(() =>
        selectToken(
          this.useReservedTokens,
          this.activeTokensData,
          this.reservedTokenData
        )
      )
    }
    return selectToken(
      this.useReservedTokens,
      this.activeTokensData,
      this.reservedTokenData
    )
  }

  onResponse = async (response: AxiosResponse) => {
    handleResponse(response, this.activeTokensData, this.reservedTokenData)
  }
}

function queryActiveTokens(): ResultAsync<TokenData[], DatabaseError> {
  return fromPromise(
    tokenDB.findAll({
      where: {
        isReserved: false,
      },
    }),
    (error) =>
      new DatabaseError("Unable to retrieve active tokens from database")
  ).map((activeTokens) =>
    activeTokens.map(
      (activeToken) =>
        ({
          id: activeToken.id,
          tokenString: activeToken.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NoResetTime,
        } as TokenData)
    )
  )
}

function handleResponse(
  response: AxiosResponse,
  activeTokensData: TokenData[],
  reservedTokenData: MaybeTokenData
) {
  parseResponseTokenData(response).map((tokenData) => {
    updateTokens(
      tokenData.token,
      tokenData.remainingRequests,
      tokenData.resetTime,
      activeTokensData,
      reservedTokenData
    )
  })
}

function activeUsageAlert(activeTokensData: TokenData[]) {
  let exhaustedTokensCount = 0
  activeTokensData.forEach((tokenData) => {
    if (
      tokenData.remainingRequests <=
      GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
    ) {
      exhaustedTokensCount += 1
    }
  })
  if (exhaustedTokensCount >= activeTokensData.length * ACTIVE_TOKEN_ALERT_2) {
    logger.info(`${ACTIVE_TOKEN_ALERT_2}% of access token capacity reached`)
    logger.info(
      `${exhaustedTokensCount}/${activeTokensData.length} active tokens exhausted`
    )
  } else if (
    exhaustedTokensCount >=
    activeTokensData.length * ACTIVE_TOKEN_ALERT_1
  ) {
    logger.info(`${ACTIVE_TOKEN_ALERT_1}% of access token capacity reached`)
    logger.info(
      `${exhaustedTokensCount}/${activeTokensData.length} active tokens exhausted`
    )
  }
}

function parseResponseTokenData(
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

function updateTokens(
  token: string,
  remainingRequests: number,
  resetTime: number,
  activeTokensData: TokenData[],
  reservedTokenData: MaybeTokenData
) {
  activeTokensData.forEach((activeTokenData) => {
    if (activeTokenData.tokenString === token) {
      activeTokenData.remainingRequests = remainingRequests
      activeTokenData.resetTime = ok(resetTime)
    }
  })
  if (
    reservedTokenData.isOk() &&
    reservedTokenData.value.tokenString === token
  ) {
    reservedTokenData.value.remainingRequests = remainingRequests
    reservedTokenData.value.resetTime = ok(resetTime)
  }
  activeUsageAlert(activeTokensData)
}

function selectToken(
  useReservedTokens: boolean,
  activeTokenData: TokenData[],
  reservedToken: MaybeTokenData
): ResultAsync<TokenData, NoAvailableTokenError | DatabaseError> {
  if (useReservedTokens === false) {
    const activeToken = selectActiveToken(activeTokenData)
    if (activeToken.isOk()) {
      return okAsync(activeToken.value)
    }
    logger.info("active tokens capacity reached")
    logger.info("switching to using reserved tokens")
    useReservedTokens = true
    setTimeout(() => {
      useReservedTokens = false
    }, GITHUB_RESET_INTERVAL * 1000) // 1 hour timeout
  }
  return selectReservedToken(reservedToken).andThen((reservedToken) => {
    if (reservedToken.isOk()) {
      return okAsync(reservedToken.value)
    }
    logger.info("reserved tokens capacity reached")
    return errAsync(new NoAvailableTokenError())
  })
}

function selectActiveToken(activeTokensData: TokenData[]): MaybeTokenData {
  let token: MaybeTokenData = NoTokenData
  const earliestResetTime: MaybeResetTime = NoResetTime
  const now: Date = new Date()
  const nowEpochSecondsUTC: number =
    now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000
  activeTokensData.forEach((activeTokenData) => {
    // Set reset time to null if time has past
    if (
      activeTokenData.resetTime.unwrapOr(Number.MAX_VALUE) < nowEpochSecondsUTC
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
          token = ok(activeTokenData)
        }
      } else if (
        earliestResetTime.isErr() ||
        activeTokenData.resetTime.value < earliestResetTime.value
      ) {
        token = ok(activeTokenData)
      }
    }
  })
  return token
}

function selectReservedToken(
  reservedTokenData: MaybeTokenData
): ResultAsync<MaybeTokenData, DatabaseError> {
  if (
    reservedTokenData.isErr() ||
    reservedTokenData.value.remainingRequests >
      GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
  ) {
    return sourceReservedToken().andThen(() => okAsync(reservedTokenData))
  }
  return okAsync(reservedTokenData)
}

function sourceReservedToken(): ResultAsync<TokenData, DatabaseError> {
  return fromPromise(
    tokenDB.findOne({
      where: {
        isReserved: true,
        resetTime: null,
      },
    }),
    (error) =>
      new DatabaseError("Unable to retrieve reserved tokens from database")
  ).andThen((reservedToken) => {
    if (reservedToken !== null) {
      const resetTime = new Date()
      resetTime.setSeconds(resetTime.getSeconds() + GITHUB_RESET_INTERVAL)
      reservedToken.resetTime = resetTime
      reservedToken.save()

      // set reset time to null after reset time
      setTimeout(() => {
        reservedToken.resetTime = null
        reservedToken.save()
      }, GITHUB_RESET_INTERVAL * 1000)

      return ok({
        id: reservedToken.id,
        tokenString: reservedToken.token,
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NoResetTime,
      })
    }
    return err(
      new DatabaseError("Unable to retrieve reserved tokens from database")
    )
  })
}

const tokenServiceInstance = new TokenService()

export { tokenServiceInstance }
