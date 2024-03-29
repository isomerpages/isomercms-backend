import { expect, jest } from "@jest/globals"
import { AxiosRequestHeaders, AxiosResponse } from "axios"
import { ok, err } from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import TokenParsingError from "@errors/TokenParsingError"

import { AccessToken } from "@database/models"
import NoAvailableTokenError from "@root/errors/NoAvailableTokenError"
import {
  GITHUB_TOKEN_LIMIT,
  GITHUB_TOKEN_THRESHOLD,
  NO_TOKEN_DATA,
  NO_RESET_TIME,
  selectActiveToken,
  selectReservedToken,
  selectToken,
  parseResponseTokenData,
  activeUsageAlert,
  GITHUB_TOKEN_REMAINING_HEADER,
  GITHUB_TOKEN_RESET_HEADER,
  TokenService,
  ReservedTokenData,
  ActiveTokenData,
} from "@services/db/TokenService"

describe("Token Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("selectActiveToken", () => {
    const mockActiveTokens = jest.fn((): ActiveTokenData[] => [
      {
        id: 1,
        tokenString: "token_1",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      },
      {
        id: 2,
        tokenString: "token_2",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      },
      {
        id: 3,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      },
    ])

    it("should pick the first active based on index", async () => {
      // Arrange
      const expected = ok({
        id: 1,
        tokenString: "token_1",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      })
      const input = mockActiveTokens()

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should pick the second token based on reset time", async () => {
      // Arrange
      const now = new Date()
      const earlyFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const lateFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 20
      const expected = ok({
        id: 2,
        tokenString: "token_2",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: ok(earlyFutureResetTime),
        type: "active",
      })
      const input = mockActiveTokens()
      input[0].resetTime = ok(lateFutureResetTime)
      input[1].resetTime = ok(earlyFutureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should pick the first active based on reset time", async () => {
      // Arrange
      const now = new Date()
      const earlyFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const lateFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 20
      const expected = ok({
        id: 1,
        tokenString: "token_1",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: ok(earlyFutureResetTime),
        type: "active",
      })
      const input = mockActiveTokens()
      input[0].resetTime = ok(earlyFutureResetTime)
      input[1].resetTime = ok(lateFutureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should set second token reset time to null pick and the first token based on index", async () => {
      // Arrange
      const now = new Date()
      const pastResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 - 10
      const expectedReturn = ok({
        id: 1,
        tokenString: "token_1",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      })
      const input = mockActiveTokens()
      input[1].resetTime = ok(pastResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expectedReturn)
    })

    it("should set first and second tokens reset time to null pick the third token based on reset time", async () => {
      // Arrange
      const now = new Date()
      const earlyPastResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 - 20
      const latePastResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 - 10
      const futureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const expectedReturn = ok({
        id: 3,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: ok(futureResetTime),
        type: "active",
      })
      const input = mockActiveTokens()
      input[0].resetTime = ok(earlyPastResetTime)
      input[1].resetTime = ok(latePastResetTime)
      input[2].resetTime = ok(futureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expectedReturn)
    })

    it("should pick the second token as first token is exhausted", async () => {
      // Arrange
      const now = new Date()
      const futureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const expected = ok({
        id: 2,
        tokenString: "token_2",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      })
      const input = mockActiveTokens()
      input[0].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[0].resetTime = ok(futureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should pick the third token as first and second token are exhausted", async () => {
      // Arrange
      const now = new Date()
      const earlyFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const lateFutureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 20
      const expected = ok({
        id: 3,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD + 1,
        resetTime: ok(lateFutureResetTime),
        type: "active",
      })
      const input = mockActiveTokens()
      input[0].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[0].resetTime = ok(earlyFutureResetTime)
      input[1].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[1].resetTime = ok(lateFutureResetTime)
      input[2].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD + 1
      input[2].resetTime = ok(lateFutureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return NoTokenData as all tokens are exhausted", async () => {
      // Arrange
      const now = new Date()
      const futureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const expected = NO_TOKEN_DATA
      const input = mockActiveTokens()
      input[0].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[0].resetTime = ok(futureResetTime)
      input[1].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[1].resetTime = ok(futureResetTime)
      input[2].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[2].resetTime = ok(futureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return second token as its reset time has past", async () => {
      // Arrange
      const now = new Date()
      const futureResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const pastResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const expected = NO_TOKEN_DATA
      const input = mockActiveTokens()
      input[0].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[0].resetTime = ok(futureResetTime)
      input[1].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[1].resetTime = ok(pastResetTime)
      input[2].remainingRequests = GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      input[2].resetTime = ok(futureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("selectReservedToken", () => {
    const mockExistingReserveToken = jest.fn(
      (): ReservedTokenData => ({
        id: 2,
        tokenString: "existing_token",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "reserve",
      })
    )

    const mockEmptyTokenDB = ({
      findAll: jest.fn(async () => null),
      findOne: jest.fn(async () => null),
    } as unknown) as ModelStatic<AccessToken>

    jest.useFakeTimers()

    it("should return the existing reserved token", async () => {
      // Arrange
      const existingToken = ok(mockExistingReserveToken())
      const expected = ok(
        ok({
          id: 2,
          tokenString: "existing_token",
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NO_RESET_TIME,
          type: "reserve",
        })
      )

      // Act
      const actual = await selectReservedToken(existingToken, mockEmptyTokenDB)

      // Assert
      expect(actual).toEqual(expected)
      jest.advanceTimersByTime(61 * 60 * 1000)
    })

    it("should return the a new reserved token data from db", async () => {
      // Arrange
      const existingToken = ok(mockExistingReserveToken())
      existingToken.value.remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD

      const mockAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 3,
        token: "reserved_token_db",
        resetTime: null,
        isReserved: true,
      } as unknown) as AccessToken

      const expected = ok(
        ok({
          id: mockAccessTokenDB.id,
          tokenString: mockAccessTokenDB.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NO_RESET_TIME,
          type: "reserve",
        })
      )

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => null),
        findOne: jest.fn(async () => mockAccessTokenDB),
      } as unknown) as ModelStatic<AccessToken>

      // Act
      const actual = await selectReservedToken(existingToken, nonEmptyTokenDB)

      // Assert
      expect(actual).toEqual(expected)
      jest.advanceTimersByTime(59 * 60 * 1000)
      expect(mockAccessTokenDB.update).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(2 * 60 * 1000)
      expect(mockAccessTokenDB.update).toHaveBeenCalledTimes(2)
    })

    it("should return no tokens with no database error", async () => {
      // Arrange
      const existingToken = ok(mockExistingReserveToken())
      existingToken.value.remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      const expected = ok(NO_TOKEN_DATA)

      const future = new Date()
      future.setSeconds(future.getSeconds() + 60)

      // Act
      const actual = await selectReservedToken(existingToken, mockEmptyTokenDB)

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("selectToken", () => {
    const mockActiveTokens = jest.fn((): ActiveTokenData[] => [
      {
        id: 1,
        tokenString: "active_token",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "active",
      },
    ])

    const mockExistingReserveToken = jest.fn(
      (): ReservedTokenData => ({
        id: 2,
        tokenString: "existing_token",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
        type: "reserve",
      })
    )

    const mockEmptyTokenDB = ({
      findAll: jest.fn(async () => null),
      findOne: jest.fn(async () => null),
    } as unknown) as ModelStatic<AccessToken>

    jest.useFakeTimers()

    it("should return an active token", async () => {
      // Arrange
      const activeTokens = mockActiveTokens()
      const existingReservedToken = ok(mockExistingReserveToken())
      const expected = ok([activeTokens[0], false])

      // Act
      const actual = await selectToken(
        false,
        activeTokens,
        existingReservedToken,
        mockEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return the stored reserved token (non-reserve mode)", async () => {
      // Arrange
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      const existingReservedToken = ok(mockExistingReserveToken())
      const expected = ok([existingReservedToken.value, true])

      // Act
      const actual = await selectToken(
        true,
        activeTokens,
        existingReservedToken,
        mockEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return the stored reserved token (reserve mode)", async () => {
      // Arrange
      const activeTokens = mockActiveTokens()
      const existingReservedToken = ok(mockExistingReserveToken())
      const expected = ok([existingReservedToken.value, true])

      // Act
      const actual = await selectToken(
        true,
        activeTokens,
        existingReservedToken,
        mockEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return the queried reserved token from db (non-reserve mode)", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[0].resetTime = ok(resetTime)
      const existingReservedToken = NO_TOKEN_DATA

      const mockAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 3,
        token: "reserved_token_db",
        resetTime: null,
        isReserved: true,
      } as unknown) as AccessToken

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => null),
        findOne: jest.fn(async () => mockAccessTokenDB),
      } as unknown) as ModelStatic<AccessToken>

      const expected = ok([
        {
          id: mockAccessTokenDB.id,
          tokenString: mockAccessTokenDB.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NO_RESET_TIME,
          type: "reserve",
        },
        true,
      ])

      // Act
      const actual = await selectToken(
        false,
        activeTokens,
        existingReservedToken,
        nonEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return the queried reserved token from db (reserve mode)", async () => {
      // Arrange
      const activeTokens = mockActiveTokens()
      const existingReservedToken = NO_TOKEN_DATA

      const mockAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 3,
        token: "reserved_token_db",
        resetTime: null,
        isReserved: true,
      } as unknown) as AccessToken

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => null),
        findOne: jest.fn(async () => mockAccessTokenDB),
      } as unknown) as ModelStatic<AccessToken>

      const expected = ok([
        {
          id: mockAccessTokenDB.id,
          tokenString: mockAccessTokenDB.token,
          remainingRequests: GITHUB_TOKEN_LIMIT,
          resetTime: NO_RESET_TIME,
          type: "reserve",
        },
        true,
      ])

      // Act
      const actual = await selectToken(
        true,
        activeTokens,
        existingReservedToken,
        nonEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise a no available token error (non-reserved mode)", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[0].resetTime = ok(resetTime)
      const existingReservedToken = NO_TOKEN_DATA

      const expected = err(new NoAvailableTokenError())

      // Act
      const actual = await selectToken(
        false,
        activeTokens,
        existingReservedToken,
        mockEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise a no available token error (reserved mode)", async () => {
      // Arrange
      const activeTokens = mockActiveTokens()
      const existingReservedToken = NO_TOKEN_DATA

      const expected = err(new NoAvailableTokenError())

      // Act
      const actual = await selectToken(
        true,
        activeTokens,
        existingReservedToken,
        mockEmptyTokenDB
      )

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("parseResponseTokenData", () => {
    const sampleGithubToken = "not_real_token_abcdefghijklmnopqrstuvwxy"

    const mockAxiosResponse = jest.fn(
      (resetTime: number) =>
        ({
          config: {
            headers: ({
              Authorization: `token ${sampleGithubToken}`,
            } as unknown) as AxiosRequestHeaders,
          },
          headers: {
            [GITHUB_TOKEN_REMAINING_HEADER]: "1234",
            [GITHUB_TOKEN_RESET_HEADER]: resetTime.toString(),
          },
          data: null,
          status: 200,
          statusText: "OK",
        } as AxiosResponse)
    )

    it("should return the parsed information", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10

      const response = mockAxiosResponse(resetTime)

      const expected = ok({
        token: sampleGithubToken,
        remainingRequests: 1234,
        resetTime,
      })

      // Act
      const actual = parseResponseTokenData(response)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise an error based on invalid token type", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const response = mockAxiosResponse(resetTime)
      if (response.config && response.config.headers) {
        response.config.headers.Authorization = true
      }

      const expected = err(new TokenParsingError(response))

      // Act
      const actual = parseResponseTokenData(response)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise an error based on invalid token prefix", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const response = mockAxiosResponse(resetTime)
      if (response.config && response.config.headers) {
        response.config.headers.Authorization = `tokan ${sampleGithubToken}`
      }

      const expected = err(new TokenParsingError(response))

      // Act
      const actual = parseResponseTokenData(response)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise an error based on invalid remaining uses", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const response = mockAxiosResponse(resetTime)
      response.headers[GITHUB_TOKEN_REMAINING_HEADER] = "abc"

      const expected = err(new TokenParsingError(response))

      // Act
      const actual = parseResponseTokenData(response)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise an error based on invalid reset time", async () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const response = mockAxiosResponse(resetTime)
      response.headers[GITHUB_TOKEN_RESET_HEADER] = "abc"

      const expected = err(new TokenParsingError(response))

      // Act
      const actual = parseResponseTokenData(response)

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("activeUsageAlert", () => {
    const mockActiveTokens = jest.fn(() => [
      {
        id: 1,
        tokenString: "token_1",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
      },
      {
        id: 2,
        tokenString: "token_2",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
      },
      {
        id: 3,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
      },
      {
        id: 4,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
      },
      {
        id: 5,
        tokenString: "token_3",
        remainingRequests: GITHUB_TOKEN_LIMIT,
        resetTime: NO_RESET_TIME,
      },
    ])

    it("should not sound any alarms", () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[0].resetTime = ok(resetTime)
      activeTokens[1].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[1].resetTime = ok(resetTime)
      const spyLogInfo = jest.spyOn(logger, "info")

      // Act
      activeUsageAlert(activeTokens)

      // Assert
      expect(spyLogInfo).not.toHaveBeenCalled()
    })

    it("should sound first alarm (60%)", () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[0].resetTime = ok(resetTime)
      activeTokens[1].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[1].resetTime = ok(resetTime)
      activeTokens[2].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[2].resetTime = ok(resetTime)
      const spyLogInfo = jest.spyOn(logger, "info")

      // Act
      activeUsageAlert(activeTokens)

      // Assert
      expect(spyLogInfo).toHaveBeenCalledWith(
        `60% of access token capacity reached`
      )
    })

    it("should sound 2nd alarm (80%)", () => {
      // Arrange
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10
      const activeTokens = mockActiveTokens()
      activeTokens[0].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[0].resetTime = ok(resetTime)
      activeTokens[1].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[1].resetTime = ok(resetTime)
      activeTokens[2].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[2].resetTime = ok(resetTime)
      activeTokens[3].remainingRequests =
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD
      activeTokens[3].resetTime = ok(resetTime)
      const spyLogInfo = jest.spyOn(logger, "info")

      // Act
      activeUsageAlert(activeTokens)

      // Assert
      expect(spyLogInfo).toHaveBeenCalledWith(
        `80% of access token capacity reached`
      )
    })
  })

  describe("TokenService", () => {
    jest.useFakeTimers()

    it("should return an active token", async () => {
      // Arrange
      const mockAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 1,
        token: "active_token_1",
        resetTime: null,
        isReserved: false,
      } as unknown) as AccessToken

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => [mockAccessTokenDB]),
        findOne: jest.fn(async () => null),
      } as unknown) as ModelStatic<AccessToken>

      const expected = ok("active_token_1")

      // Act
      const tokenService = new TokenService(nonEmptyTokenDB)
      const actual = await tokenService.getAccessToken()

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should raise an error as token has been exhausted", async () => {
      // Arrange
      const mockAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 1,
        token: "active_token_1",
        resetTime: null,
        isReserved: false,
      } as unknown) as AccessToken

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => [mockAccessTokenDB]),
        findOne: jest.fn(async () => null),
      } as unknown) as ModelStatic<AccessToken>
      const expected = err(new NoAvailableTokenError())
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10

      // Act
      const tokenService = new TokenService(nonEmptyTokenDB)
      await tokenService.getAccessToken()
      tokenService.updateTokens(
        "active_token_1",
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD,
        resetTime
      )
      const actual = await tokenService.getAccessToken()

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should wait for an hour upon entering reserve mode before going back to active", async () => {
      // Arrange
      const mockActiveAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 1,
        token: "active_token_1",
        resetTime: null,
        isReserved: false,
      } as unknown) as AccessToken

      const mockReservedAccessTokenDB: AccessToken = ({
        update: jest.fn(),
        id: 2,
        token: "reserved_token_1",
        resetTime: null,
        isReserved: true,
      } as unknown) as AccessToken

      const nonEmptyTokenDB = ({
        findAll: jest.fn(async () => [mockActiveAccessTokenDB]),
        findOne: jest.fn(async () => mockReservedAccessTokenDB),
      } as unknown) as ModelStatic<AccessToken>
      const expected1 = ok("active_token_1")
      const expected2 = ok("reserved_token_1")
      const expected3 = ok("reserved_token_1")
      const expected4 = ok("active_token_1")
      const now = new Date()
      const resetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 + 10

      // Act
      const tokenService = new TokenService(nonEmptyTokenDB)
      await tokenService.getAccessToken()
      const actual1 = await tokenService.getAccessToken()
      tokenService.updateTokens(
        "active_token_1",
        GITHUB_TOKEN_LIMIT - GITHUB_TOKEN_THRESHOLD,
        resetTime
      )
      const actual2 = await tokenService.getAccessToken()
      jest.advanceTimersByTime(59 * 60 * 1000)
      const actual3 = await tokenService.getAccessToken()
      jest.advanceTimersByTime(2 * 60 * 1000)
      const actual4 = await tokenService.getAccessToken()

      // Assert
      expect(actual1).toEqual(expected1)
      expect(actual2).toEqual(expected2)
      expect(actual3).toEqual(expected3)
      expect(actual4).toEqual(expected4)
    })
  })
})
