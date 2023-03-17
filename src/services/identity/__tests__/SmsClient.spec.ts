import mockAxios from "jest-mock-axios"

import { config } from "@config/config"

import { mockBody, mockRecipient } from "@fixtures/identity"
import _SmsClient from "@services/identity/SmsClient"

const mockEndpoint = "/transactional/sms/send"

const SmsClient = new _SmsClient()

const POSTMAN_SMS_CRED_NAME = config.get("postman.smsCredName")

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
