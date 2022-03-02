import mockAxios from "jest-mock-axios"

import _MailClient from "../MailClient"

const mockRecipient = "hello@world.com"
const mockBody = "somebody"
const mockHeaders = {
  headers: {
    Authorization: `Bearer ${process.env.POSTMAN_API_KEY}`,
  },
}
const mockEndpoint = "https://api.postman.gov.sg/v1/transactional/email/send"
const generateEmail = (recipient: string, body: string) => ({
  subject: "One-Time Password (OTP) for IsomerCMS",
  from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
  body,
  recipient,
})
const MailClient = new _MailClient()

describe("Mail Client", () => {
  afterEach(() => mockAxios.reset())

  it("should return the result successfully when all parameters are valid", async () => {
    // Arrange
    mockAxios.post.mockResolvedValueOnce(200)

    // Act
    const actual = await MailClient.sendMail(mockRecipient, mockBody)

    // Assert
    expect(actual).toBeUndefined()
    expect(mockAxios.post).toHaveBeenCalledWith(
      mockEndpoint,
      generateEmail(mockRecipient, mockBody),
      mockHeaders
    )
  })

  it("should throw an error on initialization when the env var is not set", async () => {
    // Arrange
    // Store the API key and set it later so that other tests are not affected
    const curApiKey = process.env.POSTMAN_API_KEY
    process.env.POSTMAN_API_KEY = ""

    // Act
    // NOTE: We require a new instance because the old one would already have the API key bound
    const actual = () => new _MailClient()

    // Assert
    expect(actual).toThrowError("Postman.gov.sg API key cannot be empty")
    process.env.POSTMAN_API_KEY = curApiKey
    expect(process.env.POSTMAN_API_KEY).toBe(curApiKey)
  })

  it("should bubble the error upwards when a network error occurs", async () => {
    // Arrange
    mockAxios.post.mockRejectedValueOnce("some error")

    // Act
    const actual = MailClient.sendMail(mockRecipient, mockBody)

    // Assert
    expect(actual).rejects.toThrowError("Failed to send email")
    expect(mockAxios.post).toHaveBeenCalledWith(
      mockEndpoint,
      generateEmail(mockRecipient, mockBody),
      mockHeaders
    )
  })
})
