import rateLimit from "express-rate-limit"

import { BaseIsomerError } from "@root/errors/BaseError"
import { getUserIPAddress } from "@root/utils/auth-utils"

const DEFAULT_AUTH_TOKEN_EXPIRY_MILLISECONDS = 900000

// NOTE: Refer here for more information regarding the implementation:
// https://github.com/express-rate-limit/express-rate-limit
// Also, note that our production environment has 2 instances
// and the rate limiter uses an in memory store,
// so our effective limit is 100 * 2.
// This also implies that a client can hit the limit on 1 server
// but not on the other, leading to inconsistent behaviour.
// eslint-disable-next-line import/prefer-default-export
export const rateLimiter = rateLimit({
  windowMs: DEFAULT_AUTH_TOKEN_EXPIRY_MILLISECONDS,
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // We know that this key exists in a secure env (Cloudflare)
  // See https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
  keyGenerator: (req) => {
    const userIp = getUserIPAddress(req)
    if (!userIp) {
      // This should never happen, but if it does, we should know about it
      throw new BaseIsomerError({
        status: 500,
        message: "No user IP found in the request",
      })
    }
    return userIp
  },
})
