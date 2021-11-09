const autoBind = require("auto-bind")
const express = require("express")
const validator = require("validator")

const logger = require("@logger/logger")

const { BadRequestError } = require("@errors/BadRequestError")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

class UsersRouter {
  constructor({ userService }) {
    this.userService = userService
    autoBind(this)
  }

  async sendEmailOtp(req, res) {
    const { email } = req.body
    if (!email || !validator.isEmail(email)) {
      throw new BadRequestError("Please provide a valid email")
    }

    try {
      if (!(await this.userService.canSendEmailOtp(email))) {
        throw new Error(`Invalid email ${email}`)
      }
      await this.userService.sendEmailOtp(email)
      return res.sendStatus(200)
    } catch (err) {
      logger.error(err.message)
      throw new BadRequestError("Unable to send OTP")
    }
  }

  async verifyEmailOtp(req, res) {
    const { email, otp } = req.body
    if (!this.userService.verifyOtp(email, otp)) {
      throw new BadRequestError("Invalid OTP")
    }

    await this.userService.updateUserByGitHubId(req.userId, { email })
    return res.sendStatus(200)
  }

  async sendMobileNumberOtp(req, res) {
    const { mobile } = req.body
    if (!mobile || !validator.isMobilePhone(mobile)) {
      throw new BadRequestError("Please provide a valid mobile number")
    }

    await this.userService.sendSmsOtp(mobile)
    return res.sendStatus(200)
  }

  async verifyMobileNumberOtp(req, res) {
    const { mobile, otp } = req.body
    if (!this.userService.verifyOtp(mobile, otp)) {
      throw new BadRequestError("Invalid OTP")
    }

    await this.userService.updateUserByGitHubId(req.userId, {
      contactNumber: mobile,
    })
    return res.sendStatus(200)
  }

  getRouter() {
    const router = express.Router()

    router.post("/email/otp", attachReadRouteHandlerWrapper(this.sendEmailOtp))
    router.post(
      "/email/verifyOtp",
      attachReadRouteHandlerWrapper(this.verifyEmailOtp)
    )
    router.post(
      "/mobile/otp",
      attachReadRouteHandlerWrapper(this.sendMobileNumberOtp)
    )
    router.post(
      "/mobile/verifyOtp",
      attachReadRouteHandlerWrapper(this.verifyMobileNumberOtp)
    )

    return router
  }
}

module.exports = { UsersRouter }
