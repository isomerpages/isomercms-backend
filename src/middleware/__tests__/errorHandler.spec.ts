import { AxiosError } from "axios"
import _ from "lodash"
import { serializeError } from "serialize-error"

import { errorHandler } from "../errorHandler"

const mockReq = {
  app: {
    get: () => "development",
  },
}
const mockJson = jest.fn().mockImplementation(() => null)
const mockRes = {
  locals: {
    message: "some message",
    error: "some error",
  },
  status: () => ({
    json: mockJson,
  }),
}
const mockNext = jest.fn()
const mockAxiosError: AxiosError = {
  config: {},
  request: {},
  isAxiosError: true,
  toJSON: jest.fn().mockReturnThis(),
  name: "MOCK_AXIOS_ERROR",
  message: "oops",
}

describe("error handler", () => {
  const stringifySpy = jest.spyOn(JSON, "stringify")

  it("should not omit any data if the request property does not exist", async () => {
    // Act
    errorHandler(mockAxiosError, mockReq, mockRes, mockNext)

    // Assert
    expect(stringifySpy).toHaveBeenCalledWith(serializeError(mockAxiosError))
  })

  it("should omit both `request` and `config` if `request` exists", async () => {
    // Assert
    const mockAxiosErrorWithRequest = {
      ...mockAxiosError,
      config: {
        headers: {
          Authorization: "token MOCK_TOKEN",
        },
      },
    }

    // Act
    errorHandler(mockAxiosErrorWithRequest, mockReq, mockRes, mockNext)

    // Assert
    expect(stringifySpy).toHaveBeenCalledWith(
      // NOTE: `config` property removed
      serializeError(_.omit(mockAxiosError, ["config", "request"]))
    )
  })
})
