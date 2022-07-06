import { Request, Response } from "express"

import { AuthError } from "@errors/AuthError"
import { UnprocessableError } from "@errors/UnprocessableError"

import _FormsProcessingService, { FormsSdk } from "../FormsProcessingService"

const MOCK_SIGNATURE = "signature"
const MOCK_HOST = "host"
const MOCK_DATA = "data"
const MOCK_BODY = {
  data: MOCK_DATA,
}
const mockReq = {
  get(name) {
    if (name === "X-FormSG-Signature") return MOCK_SIGNATURE
    if (name === "host") return MOCK_HOST
    return null
  },
  baseUrl: "baseUrl",
  path: "path",
  body: MOCK_BODY,
} as Request
const mockRes = {
  locals: {},
} as Response
const mockNext = jest.fn()
const mockFormsg = {
  webhooks: {
    authenticate: jest.fn(),
  },
  crypto: {
    decrypt: jest.fn(),
  },
}
const MOCK_POST_URI = `https://${mockReq.get("host")}${mockReq.baseUrl}${
  mockReq.path
}`
const FormsProcessingService = new _FormsProcessingService({
  formsg: (mockFormsg as unknown) as FormsSdk,
})

describe("FormSG Processing Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe("Authenticate", () => {
    it("should call authenticate successfully and call next() when the call to authenticate is successful", async () => {
      // Arrange
      mockFormsg.webhooks.authenticate.mockReturnValue(true)
      const authenticateMiddleware = FormsProcessingService.authenticate()

      // Act
      authenticateMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockFormsg.webhooks.authenticate).toHaveBeenCalledWith(
        MOCK_SIGNATURE,
        MOCK_POST_URI
      )
    })

    it("should not call next handler if authentication fails", async () => {
      // Arrange
      mockFormsg.webhooks.authenticate.mockImplementationOnce(() => {
        throw new Error()
      })
      const authenticateMiddleware = FormsProcessingService.authenticate()

      // Act
      const result = () => authenticateMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(result).toThrow(AuthError)
      expect(mockFormsg.webhooks.authenticate).toHaveBeenCalledWith(
        MOCK_SIGNATURE,
        MOCK_POST_URI
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should not call next handler if signature is missing", async () => {
      // Arrange
      const mockMissingSignature = ({
        ...mockReq,
        get() {
          return null
        },
      } as unknown) as Request
      const authenticateMiddleware = FormsProcessingService.authenticate()

      // Act
      const result = () =>
        authenticateMiddleware(mockMissingSignature, mockRes, mockNext)

      // Assert
      expect(result).toThrow(AuthError)
      expect(mockFormsg.webhooks.authenticate).not.toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe("Decrypt", () => {
    const MOCK_FORM_KEY = "mockKey"
    const MOCK_SUBMISSION = "submission"
    beforeEach(() => {
      mockRes.locals = {}
    })
    it("should call decrypt successfully, store submission data and call next() when the call to decrypt is successful", async () => {
      // Arrange
      mockFormsg.crypto.decrypt.mockReturnValue(MOCK_SUBMISSION)
      const decryptMiddleware = FormsProcessingService.decrypt({
        formKey: MOCK_FORM_KEY,
      })

      // Act
      decryptMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockFormsg.crypto.decrypt).toHaveBeenCalledWith(
        MOCK_FORM_KEY,
        MOCK_DATA
      )
      expect(mockRes.locals.submission).toStrictEqual(MOCK_SUBMISSION)
    })

    it("should not call next handler if decrypt fails", async () => {
      // Arrange
      mockFormsg.crypto.decrypt.mockReturnValue(null)
      const decryptMiddleware = FormsProcessingService.decrypt({
        formKey: MOCK_FORM_KEY,
      })

      // Act
      const result = () => decryptMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(result).toThrow(UnprocessableError)
      expect(mockFormsg.crypto.decrypt).toHaveBeenCalledWith(
        MOCK_FORM_KEY,
        MOCK_DATA
      )
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockRes.locals.submission).toStrictEqual(undefined)
    })
  })
})
