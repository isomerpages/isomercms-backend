const express = require("express")
const validator = require("validator")

const logger = require("@logger/logger")

// Import error
const { AuthError } = require("@errors/AuthError")
const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

// Import services
const { authService, userService } = require("@services/identity")

const router = express.Router()

async function sendEmailOtp(req, res) {
  const { email } = req.body
  if (!email || !validator.isEmail(email)) {
    throw new BadRequestError("Please provide a valid email")
  }

  try {
    if (!(await authService.canSendEmailOtp(email))) {
      throw new Error(`Invalid email ${email}`)
    }
    await authService.sendEmailOtp(email)
    return res.sendStatus(200)
  } catch (err) {
    logger.error(err.message)
    throw new AuthError("Unable to send OTP")
  }
}

async function verifyEmailOtp(req, res) {
  const { email, otp } = req.body
  if (!authService.verifyEmailOtp(email, otp)) {
    throw new AuthError("Invalid OTP")
  }

  await userService.updateUserByGitHubId(req.userId, { email })
  return res.sendStatus(200)
}

router.post("/email/otp", attachReadRouteHandlerWrapper(sendEmailOtp))
router.post("/email/verifyOtp", attachReadRouteHandlerWrapper(verifyEmailOtp))

module.exports = router
