import {
  mockRecipient,
  mockBody,
  mockBearerTokenHeaders,
} from "@fixtures/identity"

import _MailClient from "../MailClient"

const axios = require("axios")

const mockEndpoint = "https://api.postman.gov.sg/v1/transactional/email/send"

const MailClient = new _MailClient(process.env.POSTMAN_API_KEY!)

const generateEmail = (recipient: string, body: string) => ({
  subject: "One-Time Password (OTP) for IsomerCMS",
  from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
  body,
  recipient,
  reply_to: "noreply@isomer.gov.sg",
})

describe("Mail Client", () => {
  it("should return the result successfully when all parameters are valid", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce(200)

    // Act
    const actual = await MailClient.sendMail(mockRecipient, mockBody)

    // Assert
    expect(actual).toBeUndefined()
    expect(axios.post).toHaveBeenCalledWith(
      mockEndpoint,
      generateEmail(mockRecipient, mockBody),
      mockBearerTokenHeaders
    )
  })

  it("should return an error when a network error occurs", async () => {
    // Arrange
    const generatedEmail = generateEmail(mockRecipient, mockBody)
    axios.post.mockRejectedValueOnce("some error")

    // Act
    const actual = MailClient.sendMail(mockRecipient, mockBody)

    // Assert
    expect(actual).rejects.toThrowError("Failed to send email")
    expect(axios.post).toHaveBeenCalledWith(
      mockEndpoint,
      generatedEmail,
      mockBearerTokenHeaders
    )
  })
})
