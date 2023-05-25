import { expect, jest } from "@jest/globals"
import { ok } from "neverthrow"
import { ModelStatic } from "sequelize"

import { AccessToken } from "@database/models"
import {
  GITHUB_TOKEN_LIMIT,
  GITHUB_TOKEN_THRESHOLD,
  NoTokenData,
  NoResetTime,
  selectActiveToken,
} from "@services/db/TokenService"

const mockTokenDB = jest.mocked<ModelStatic<AccessToken>>(({
  findAll: jest.fn(),
  findOne: jest.fn(),
} as unknown) as ModelStatic<AccessToken>)

describe("Token Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("selectActiveToken", () => {
    const mockActiveTokens = jest.fn(() => [
      {
        id: 1,
        tokenString: "token_1",
        remainingRequests: 5000,
        resetTime: NoResetTime,
      },
      {
        id: 2,
        tokenString: "token_2",
        remainingRequests: 5000,
        resetTime: NoResetTime,
      },
      {
        id: 3,
        tokenString: "token_3",
        remainingRequests: 5000,
        resetTime: NoResetTime,
      },
    ])

    it("should pick the first active based on index", async () => {
      // Arrange
      const expected = ok({
        id: 1,
        tokenString: "token_1",
        remainingRequests: 5000,
        resetTime: NoResetTime,
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
        remainingRequests: 5000,
        resetTime: ok(earlyFutureResetTime),
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
        remainingRequests: 5000,
        resetTime: ok(earlyFutureResetTime),
      })
      const input = mockActiveTokens()
      input[0].resetTime = ok(earlyFutureResetTime)
      input[1].resetTime = ok(lateFutureResetTime)

      // Act
      const actual = selectActiveToken(input)

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should set second token reset time to null pick the first token based on index", async () => {
      // Arrange
      const now = new Date()
      const pastResetTime =
        now.getTime() / 1000 + (now.getTimezoneOffset() * 60) / 1000 - 10
      const expectedReturn = ok({
        id: 1,
        tokenString: "token_1",
        remainingRequests: 5000,
        resetTime: NoResetTime,
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
        remainingRequests: 5000,
        resetTime: ok(futureResetTime),
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
        remainingRequests: 5000,
        resetTime: NoResetTime,
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
      const expected = NoTokenData
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
  })
})
