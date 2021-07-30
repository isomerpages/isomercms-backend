const { OTP_SECRET } = process.env

class TotpGenerator {
  constructor(secret) {
    this.secret = secret
  }

  generate(_email) {
    return "11111"
  }

  verify(_email, _otp) {
    return true
  }
}

module.exports = new TotpGenerator(OTP_SECRET)
