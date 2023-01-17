import rateLimit from "express-rate-limit"

// NOTE: Refer here for more information regarding the implementation:
// https://github.com/express-rate-limit/express-rate-limit
// Also, note that our production environment has 2 instances
// and the rate limiter uses an in memory store,
// so our effective limit is 100 * 2.
// This also implies that a client can hit the limit on 1 server
// but not on the other, leading to inconsistent behaviour.
// eslint-disable-next-line import/prefer-default-export
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
