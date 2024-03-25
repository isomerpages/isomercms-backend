import baseLogger, { MAX_STACK_DEPTH, getTraceMeta } from "../logger"
import { StackFrame, get, parse } from "../stack-trace"

const MESSAGE = "logs are deadtrees"

const logger = baseLogger.child({ module: "logger.spec.ts" })

jest.mock("../stack-trace", () => {
  const actual = jest.requireActual("../stack-trace")
  return {
    ...actual,
    get: jest.fn(),
  }
})

describe("logger", () => {
  const errorSpy = jest.spyOn(logger._logger, "error")

  afterEach(() => {
    errorSpy.mockClear()
  })

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
    expect(warnSpy).toHaveBeenCalledWith(MESSAGE, {
      meta: { params: mockParams },
      stackTrace: getTraceMeta([mockStackFrame]),
    })
  })

  it("should call the underlying method on error with the given `Error` when an error is passed", async () => {
    // Arrange
    const mockError = new Error("mock error")
    const mockParams = { a: 1 }

    // Act
    logger.error(mockError, {
      params: mockParams,
    })

    // Assert
    expect(errorSpy).toHaveBeenCalledWith({
      error: mockError,
      meta: {
        params: mockParams,
      },
      stackTrace: getTraceMeta(parse(mockError).slice(0, MAX_STACK_DEPTH)),
    })
  })

  it("should call the underlying method on error when a string is passed", async () => {
    // Arrange
    const mockParams = { a: 1 }

    // Act
    logger.error(MESSAGE, {
      params: mockParams,
    })

    // Assert
    expect(errorSpy).toHaveBeenCalledWith(MESSAGE, {
      meta: {
        params: mockParams,
      },
      stackTrace: getTraceMeta(get().slice(0, MAX_STACK_DEPTH)),
    })
  })

  it("should be able to parse properly if both error and message is passed ", async () => {
    // Arrange
    const mockError = new Error("mock error")
    const mockParams = { a: 1 }

    // Act
    logger.error(MESSAGE, {
      error: mockError,
      params: mockParams,
    })

    // Assert
    expect(errorSpy).toHaveBeenCalledWith(MESSAGE, {
      meta: {
        params: mockParams,
        // NOTE: In the event that devs pass both `error` and `message`,
        // we will preserve the error but preferentially
        // get the stack trace from the message.
        error: mockError,
      },
      stackTrace: getTraceMeta(get().slice(0, MAX_STACK_DEPTH)),
    })
  })
})
