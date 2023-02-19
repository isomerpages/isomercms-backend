import crypto from "crypto"

import bcrypt from "bcrypt"

const SALT_TIMES = 10
const TOTP_LENGTH = 6

class OtpService {
  private generateOtp = (): string =>
    // Generates cryptographically strong pseudo-random data.
    Array(TOTP_LENGTH)
      .fill(0)
      .map(() => crypto.randomInt(0, 10))
      .join("")

  generateLoginOtpWithHash = async () => {
    const otp = this.generateOtp()
    const hashedOtp = await bcrypt.hash(otp, SALT_TIMES)
    return { otp, hashedOtp }
  }

  verifyOtp = async (otp: string, hashedOtp: string): Promise<boolean> => {
    if (!otp || !hashedOtp) return false
    return bcrypt.compare(otp, hashedOtp)
  }
}

export default OtpService
