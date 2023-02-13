import crypto from "crypto"

import bcrypt from "bcrypt"
import { ModelStatic } from "sequelize"
import validator from "validator"

import { BadRequestError } from "@root/errors/BadRequestError"
import logger from "@root/logger/logger"

const { OTP_EXPIRY } = process.env

const PARSED_EXPIRY = parseInt(OTP_EXPIRY!, 10) ?? undefined
const SALT_TIMES = 10

interface OtpServiceProps {
  otpRepository: ModelStatic<>
}

class OtpService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly otpRepository: OtpServiceProps["otpRepository"]

  constructor({ otpRepository }: OtpServiceProps) {
    this.otpRepository = otpRepository
  }

  generateOtp = (): string =>
    // Generates cryptographically strong pseudo-random data.
    Array(6)
      .fill(0)
      .map(() => crypto.randomInt(0, 10))
      .join("")

  generateLoginOtpWithHash = async (email: string) => {
    if (!validator.isEmail(email)) {
      logger.error(`Otp requested for invalid email: ${email}`)
      throw new BadRequestError(`Invalid email provided`)
    }
    const otp = this.generateOtp()
    const hashedOtp = await bcrypt.hash(otp, SALT_TIMES)
    await this.otpRepository.upsert({
      email,
      hashedOtp,
      expiry: new Date(Date.now() + PARSED_EXPIRY),
    })
    return { otp, hashedOtp }
  }

  getHashedOtpAndIncrementAttempts = async (email: string) => {
    const otpEntry = this.otpRepository.find()
    // If too many attempts, throw error
    // If not exists (expired), throw error
    // return hasehdOtp
  }

  verifyOtp = async (email: string, otp: string) => {
    const hashedOtp = this.getHashedOtpAndIncrementAttempts()
    const isValid = bcrypt.compare(otp, hashedOtp)
  }
}

export default OtpService
