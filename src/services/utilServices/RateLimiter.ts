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
export const rateLimiter = rateLimit({
  windowMs: DEFAULT_AUTH_TOKEN_EXPIRY_MILLISECONDS,
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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

/**
 * | Scenario                     | IP+email only | Email only  | Both          |
 * |------------------------------|---------------|-------------|---------------|
 * | 1 attacker IP, 1 victim      | 5 requests    | 10 requests | 5 requests    |
 * | 9 attacker IPs, 1 victim     | 45 requests   | 10 requests | 10 requests   |
 * | 1 attacker IP, many victims  | 5 per victim  | Unlimited   | 5 per victim  |
 */

// Rate limiter for OTP generation that limits by IP+email combination.
// This prevents attackers with multiple IPs from continuously requesting new OTPs
// to invalidate existing ones for a victim's email address.
// Limit: 5 OTP requests per IP+email combination per 15 minutes.
export const otpGenerationRateLimiter = rateLimit({
  windowMs: DEFAULT_AUTH_TOKEN_EXPIRY_MILLISECONDS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userIp = getUserIPAddress(req)
    if (!userIp) {
      throw new BaseIsomerError({
        status: 500,
        message: "No user IP found in the request",
      })
    }
    const email = req.body?.email?.toLowerCase() || "unknown"
    return `otp:${userIp}:${email}`
  },
})

// Additional rate limiter to limit total OTP requests per email
// across all IPs. This prevents distributed attacks using many IPs.
// Limit: 10 OTP requests per email per 15 minutes (across all IPs).
export const otpGenerationByEmailRateLimiter = rateLimit({
  windowMs: DEFAULT_AUTH_TOKEN_EXPIRY_MILLISECONDS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase() || "unknown"
    return `otp-email:${email}`
  },
})
