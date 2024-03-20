import pino from "pino"

import { Logger, TraceMeta, getTraceMeta } from "../logger"
import { StackFrame, get, parse } from "../stack-trace"

const logger = new Logger(pino())
const MESSAGE = "logs are deadtrees"

jest.mock("../stack-trace", () => {
  const actual = jest.requireActual("../stack-trace")
  return {
    ...actual,
    get: jest.fn(),
  }
})

type LogMeta = {
  isomer: {
    meta: Record<string, unknown>
    trace: TraceMeta[]
  }
}

const formatMeta = (
  meta: Record<string, unknown>,
  trace: TraceMeta[]
): LogMeta => ({
  isomer: {
    meta,
    trace,
  },
})

describe("logger", () => {
  it("should call the underlying method on info", async () => {
    // Arrange
    const infoSpy = jest.spyOn(logger._logger, "info")

    // Act
    logger.info(MESSAGE)

    // Assert
    expect(infoSpy).toHaveBeenCalledWith(MESSAGE)
  })

  it("should call the underlying method on warn and have a stack trace by default", async () => {
    // Arrange
    const warnSpy = jest.spyOn(logger._logger, "warn")
    const mockParams = { a: 1 }
    const mockStackFrame = {
      getFileName: () => "file",
      getLineNumber: () => 1,
      getFunctionName: () => "func",
    } as StackFrame
    const mockGet = jest.mocked(get)
    mockGet.mockReturnValue([mockStackFrame])

    // Act
    logger.warn(MESSAGE, {
      params: mockParams,
    })

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      MESSAGE,
      formatMeta({ params: mockParams }, getTraceMeta([mockStackFrame]))
    )
  })

  it("should call the underlying method on error and have a stack trace by default", async () => {
    // Arrange
    const errorSpy = jest.spyOn(logger._logger, "error")
    const mockError = new Error("mock error")
    const mockParams = { a: 1 }

    // Act
    logger.error(MESSAGE, {
      error: mockError,
      params: mockParams,
    })

    // Assert
    expect(errorSpy).toHaveBeenCalledWith(
      MESSAGE,
      formatMeta(
        { params: mockParams, error: mockError },
        getTraceMeta(parse(mockError).slice(0, 3))
      )
    )
  })
})
