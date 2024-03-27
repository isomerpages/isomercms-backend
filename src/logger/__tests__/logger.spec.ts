import logger, { MAX_STACK_DEPTH, getTraceMeta } from "../logger"
import { StackFrame, get, parse } from "../stack-trace"

const MESSAGE = "logs are deadtrees"

jest.mock("../stack-trace", () => {
  const actual = jest.requireActual("../stack-trace")
  return {
    ...actual,
    get: jest.fn(),
  }
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
    logger.warn({
      message: MESSAGE,
      params: mockParams,
    })

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      {
        meta: { params: mockParams },
        stackTrace: getTraceMeta([mockStackFrame]),
      },
      MESSAGE
    )
  })

  it("should call the underlying method on error with the given `Error` when an error is passed", async () => {
    // Arrange
    const errorSpy = jest.spyOn(logger._logger, "error")
    const mockError = new Error("mock error")
    const mockParams = { a: 1 }

    // Act
    logger.error({
      error: mockError,
      params: mockParams,
    })

    // Assert
    expect(errorSpy).toHaveBeenCalledWith({
      meta: {
        params: mockParams,
      },
      error: mockError,
      stackTrace: getTraceMeta(parse(mockError).slice(0, MAX_STACK_DEPTH)),
    })
  })

  it("should call the underlying method on error when a string is passed", async () => {
    // Arrange
    const errorSpy = jest.spyOn(logger._logger, "error")

    // Act
    logger.error(MESSAGE)

    // Assert
    expect(errorSpy).toHaveBeenCalledWith(
      {
        stackTrace: getTraceMeta(get().slice(0, MAX_STACK_DEPTH)),
      },
      MESSAGE
    )
  })
})
