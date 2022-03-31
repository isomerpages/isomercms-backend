import mockAxios from "jest-mock-axios"

import {
  mockRecipient,
  mockBody,
  mockBearerTokenHeaders,
} from "@fixtures/identity"

import _MailClient from "../MailClient"

const mockEndpoint = "https://api.postman.gov.sg/v1/transactional/email/send"

const MailClient = new _MailClient()

const generateEmail = (recipient: string, body: string) => ({
  subject: "One-Time Password (OTP) for IsomerCMS",
  from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
  body,
  recipient,
  reply_to: "noreply@isomer.gov.sg",
})

describe("Mail Client", () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    // Clears the cache so imports in tests uses a fresh copy
    jest.resetModules()
    // Make a copy of existing environment
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    // Restore old environment
    process.env = OLD_ENV
  })

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
      mockBearerTokenHeaders
    )
  })

  it("should throw an error on initialization when the env var is not set", async () => {
    // Arrange
    // Store the API key and set it later so that other tests are not affected
    const curApiKey = process.env.POSTMAN_API_KEY
    process.env.POSTMAN_API_KEY = ""
    // NOTE: This is because of typescript transpiling down to raw js
    // Export default compiles down to module.exports.default, which is also
    // done by babel.
    // Read more here: https://www.typescriptlang.org/tsconfig#allowSyntheticDefaultImports
    const _MailClientWithoutKey = (await import("../MailClient")).default

    // Act
    // NOTE: We require a new instance because the old one would already have the API key bound
    const actual = () => new _MailClientWithoutKey()

    // Assert
    expect(actual).toThrowError("Postman.gov.sg API key cannot be empty")
    process.env.POSTMAN_API_KEY = curApiKey
    expect(process.env.POSTMAN_API_KEY).toBe(curApiKey)
  })

  it("should return an error when a network error occurs", async () => {
    // Arrange
    const generatedEmail = generateEmail(mockRecipient, mockBody)
    mockAxios.post.mockRejectedValueOnce("some error")

    // Act
    const actual = MailClient.sendMail(mockRecipient, mockBody)

    // Assert
    expect(actual).rejects.toThrowError("Failed to send email")
    expect(mockAxios.post).toHaveBeenCalledWith(
      mockEndpoint,
      generatedEmail,
      mockBearerTokenHeaders
    )
  })
})
