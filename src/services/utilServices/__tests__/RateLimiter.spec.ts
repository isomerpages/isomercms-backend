import express from "express"
import rateLimit from "express-rate-limit"
import request from "supertest"

describe("rate limiting", () => {
  // NOTE: There is a need to initialise another rate limiter
  // as the rate limit library uses an in-memory store for each instance.
  // This means that the requests made in another test would also impact the rate limit.
  const mockRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1,
  })
  const rateLimitedRouter = express()
  rateLimitedRouter.use(mockRateLimiter)
  rateLimitedRouter.get("/test", (req, res) => {
    res.status(200).send()
  })

  it("should allow all the requests through when the number of requests made is below the limit of 1", async () => {
    // Act + assert
    await request(rateLimitedRouter).get("/test").expect(200)
  })

  it("should disallow the 101th request made within the 15 minute window", async () => {
    // Act
    const resp = await request(rateLimitedRouter).get(`/test`).expect(429)

    // Assert
    expect(resp.text).toBe("Too many requests, please try again later.")
  })
})
