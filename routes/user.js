const express = require("express")
const validator = require("validator")

const logger = require("@logger/logger")

// Import error
const { AuthError } = require("@errors/AuthError")
const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

// Import services
const { userService } = require("@services/identity")

const router = express.Router()

async function sendEmailOtp(req, res) {
  const { email } = req.body
  if (!email || !validator.isEmail(email)) {
    throw new BadRequestError("Please provide a valid email")
  }

  try {
    if (!(await userService.canSendEmailOtp(email))) {
      throw new Error(`Invalid email ${email}`)
    }
    await userService.sendEmailOtp(email)
    return res.sendStatus(200)
  } catch (err) {
    logger.error(err.message)
    throw new AuthError("Unable to send OTP")
  }
}

async function verifyEmailOtp(req, res) {
  const { email, otp } = req.body
  if (!userService.verifyOtp(email, otp)) {
    throw new AuthError("Invalid OTP")
  }

  await userService.updateUserByGitHubId(req.userId, { email })
  return res.sendStatus(200)
}

async function sendMobileNumberOtp(req, res) {
  const { mobile } = req.body
  if (!mobile || !validator.isMobilePhone(mobile)) {
    throw new BadRequestError("Please provide a valid mobile number")
  }

  await userService.sendSmsOtp(mobile)
  return res.sendStatus(200)
}

async function verifyMobileNumberOtp(req, res) {
  const { mobile, otp } = req.body
  if (!userService.verifyOtp(mobile, otp)) {
    throw new AuthError("Invalid OTP")
  }

  await userService.updateUserByGitHubId(req.userId, { contactNumber: mobile })
  return res.sendStatus(200)
}

router.post("/email/otp", attachReadRouteHandlerWrapper(sendEmailOtp))
router.post("/email/verifyOtp", attachReadRouteHandlerWrapper(verifyEmailOtp))
router.post("/mobile/otp", attachReadRouteHandlerWrapper(sendMobileNumberOtp))
router.post(
  "/mobile/verifyOtp",
  attachReadRouteHandlerWrapper(verifyMobileNumberOtp)
)

module.exports = router
