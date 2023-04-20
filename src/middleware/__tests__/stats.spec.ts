import express, { RequestHandler } from "express"
import request from "supertest"
import { mocked } from "ts-jest/utils"

import { StatsService } from "@root/services/infra/StatsService"

import { StatsMiddleware } from "../stats"

const mockStatsService = mocked<StatsService>(({
  countDbUsers: jest.fn(),
} as unknown) as StatsService)

const statsMiddleware = new StatsMiddleware(mockStatsService)

const mockFn: RequestHandler = (req, res) => res.send(200)
const app = express()

app.use("/", statsMiddleware.countDbUsers, mockFn)

describe("stats middleware", () => {
  it("should not impact application code when middleware throws an error", async () => {
    // Arrange
    mockStatsService.countDbUsers.mockRejectedValueOnce(0)

    // Act
    const actual = await request(app).get(`/`)

    // Assert
    expect(actual.statusCode).toBe(200)
  })
})
