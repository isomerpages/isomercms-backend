import mockAxios from "jest-mock-axios"

import { mockBody, mockRecipient } from "@fixtures/identity"

import _SmsClient from "../SmsClient"

const mockEndpoint = "/transactional/sms/send"

const SmsClient = new _SmsClient()

const { POSTMAN_SMS_CRED_NAME } = process.env

const generateSms = (recipient: string, body: string) => ({
  recipient,
  body,
  label: POSTMAN_SMS_CRED_NAME,
})

describe("Sms Client", () => {
  afterEach(() => mockAxios.reset())

  it("should return the result successfully when all parameters are valid", async () => {
    // Arrange
    const generatedSms = generateSms(mockRecipient, mockBody)
    mockAxios.post.mockResolvedValueOnce("good stuff")

    // Act
    await SmsClient.sendSms(mockRecipient, mockBody)

    // Assert
    expect(mockAxios.post).toHaveBeenCalledWith(mockEndpoint, generatedSms)
  })

  it("should throw an error on initialization when there is no api key", () => {
    // Arrange
    // Store the API key and set it later so that other tests are not affected
    const curApiKey = process.env.POSTMAN_API_KEY
    process.env.POSTMAN_API_KEY = ""

    // Act
    // NOTE: We require a new instance because the old one would already have the API key bound
    const actual = () => new _SmsClient()

    // Assert
    expect(actual).toThrowError("Postman.gov.sg API key cannot be empty")
    process.env.POSTMAN_API_KEY = curApiKey
    expect(process.env.POSTMAN_API_KEY).toBe(curApiKey)
  })

  it("should return an error when a network error occurs", async () => {
    // Arrange
    const generatedSms = generateSms(mockRecipient, mockBody)
    mockAxios.post.mockRejectedValueOnce("some error")

    // Act
    const actual = SmsClient.sendSms(mockRecipient, mockBody)

    // Assert
    expect(actual).rejects.toThrowError("Failed to send SMS.")
    expect(mockAxios.post).toHaveBeenCalledWith(mockEndpoint, generatedSms)
  })
})
