class MailClient {
  async sendMail(_recipient, body) {
    console.log(body)
  }
}

module.exports = new MailClient()
