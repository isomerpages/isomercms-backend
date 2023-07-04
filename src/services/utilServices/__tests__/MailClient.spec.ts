import mockAxios from "jest-mock-axios"

import { config } from "@config/config"

import {
  mockRecipient,
  mockSubject,
  mockBody,
  mockBearerTokenHeaders,
} from "@fixtures/identity"
import _MailClient from "@services/utilServices/MailClient"

const mockEndpoint = "https://api.postman.gov.sg/v1/transactional/email/"

const MailClient = new _MailClient(config.get("postman.apiKey"))

const generateEmail = (recipient: string, subject: string, body: string) => ({
  subject,
  from: "IsomerCMS <donotreply@mail.postman.gov.sg>",
  body,
  recipient,
  reply_to: "noreply@isomer.gov.sg",
})

describe("Mail Client", () => {
  afterEach(() => mockAxios.reset())
  jest.useFakeTimers()
  it("should return the result successfully when all parameters are valid", async () => {
    // Arrange
    const generatedEmail = generateEmail(mockRecipient, mockSubject, mockBody)
    const sendMailResponse = {
      data: {
        id: 1,
        recipient: mockRecipient,
        status: "ACCEPTED",
      },
      status: 201,
      statusText: "Created",
    }
    const verifyMailResponse = {
      data: {
        id: 1,
        recipient: mockRecipient,
        status: "DELIVERED",
      },
      status: 200,
      statusText: "Ok",
    }
    mockAxios.post.mockResolvedValueOnce(sendMailResponse)
    mockAxios.get.mockResolvedValueOnce(verifyMailResponse)

    // Act
    const actual = await MailClient.sendMail(
      mockRecipient,
      mockSubject,
      mockBody
    )

    await jest.advanceTimersByTime(60000)

    // Assert
    expect(actual).toBeUndefined()
    expect(mockAxios.post).toHaveBeenCalledWith(
      `${mockEndpoint}send`,
      generatedEmail,
      mockBearerTokenHeaders
    )
    expect(mockAxios.get).toHaveBeenCalledWith(
      `${mockEndpoint}1`,
      mockBearerTokenHeaders
    )
  })

  it("should return an error when a network error occurs", async () => {
    // Arrange
    const generatedEmail = generateEmail(mockRecipient, mockSubject, mockBody)
    mockAxios.post.mockRejectedValueOnce("some error")

    // Act
    const actual = MailClient.sendMail(mockRecipient, mockSubject, mockBody)

    // Assert
    expect(actual).rejects.toThrowError("Failed to send email")
    expect(mockAxios.post).toHaveBeenCalledWith(
      `${mockEndpoint}send`,
      generatedEmail,
      mockBearerTokenHeaders
    )
  })
})
