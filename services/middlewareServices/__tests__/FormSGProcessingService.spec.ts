import { Request, Response } from "express"

import { AuthError } from "@errors/AuthError"

import _FormSGProcessingService, {
  CanDecryptFormSGPayload,
} from "../FormSGProcessingService"

const mockSignature = "signature"
const mockHost = "host"
const mockData = "data"
const mockBody = {
  data: mockData,
}
const mockReq = {
  get(name) {
    if (name === "X-FormSG-Signature") return mockSignature
    if (name === "host") return mockHost
    return null
  },
  baseUrl: "baseUrl",
  path: "path",
  body: mockBody,
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
const mockPostUri = `https://${mockReq.get("host")}${mockReq.baseUrl}${
  mockReq.path
}`
const FormSGProcessingService = new _FormSGProcessingService({
  formsg: (mockFormsg as unknown) as CanDecryptFormSGPayload,
})

describe("FormSG Processing Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe("Authenticate", () => {
    it("should call authenticate successfully and call next() when the call is successful", async () => {
      // Arrange
      mockFormsg.webhooks.authenticate.mockReturnValue(true)
      const authenticateMiddleware = FormSGProcessingService.authenticate()

      // Act
      authenticateMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockFormsg.webhooks.authenticate).toHaveBeenCalledWith(
        mockSignature,
        mockPostUri
      )
    })

    it("should not call next handler if authentication fails", async () => {
      // Arrange
      mockFormsg.webhooks.authenticate.mockImplementationOnce(() => {
        throw new Error()
      })
      const authenticateMiddleware = FormSGProcessingService.authenticate()

      // Act
      const result = () => authenticateMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(result).toThrow(AuthError)
      expect(mockFormsg.webhooks.authenticate).toHaveBeenCalledWith(
        mockSignature,
        mockPostUri
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
      const authenticateMiddleware = FormSGProcessingService.authenticate()

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
    const mockFormKey = "mockKey"
    const mockSubmission = "submission"
    it("should call decrypt successfully, store submission data and call next() when the call is successful", async () => {
      // Arrange
      mockFormsg.crypto.decrypt.mockReturnValue(mockSubmission)
      const decryptMiddleware = FormSGProcessingService.decrypt({
        formKey: mockFormKey,
      })

      // Act
      decryptMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalled()
      expect(mockFormsg.crypto.decrypt).toHaveBeenCalledWith(
        mockFormKey,
        mockData
      )
      expect(mockRes.locals.submission).toStrictEqual(mockSubmission)
    })

    it("should not call next handler if decrypt is unauthorised", async () => {
      // Arrange
      mockFormsg.crypto.decrypt.mockImplementationOnce(() => {
        throw new Error()
      })
      const decryptMiddleware = FormSGProcessingService.decrypt({
        formKey: mockFormKey,
      })

      // Act
      const result = () => decryptMiddleware(mockReq, mockRes, mockNext)

      // Assert
      expect(result).toThrow(AuthError)
      expect(mockFormsg.crypto.decrypt).toHaveBeenCalledWith(
        mockFormKey,
        mockData
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
