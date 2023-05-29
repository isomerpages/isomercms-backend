import { IsomerLogger } from "../logger"
import { Logger } from "../logger.types"

const logger = new IsomerLogger()
const mockLog = jest.fn()
const mockLogger: Logger = {
  info: mockLog,
  warn: mockLog,
  error: mockLog,
}

const MOCK_LOG_MESSAGE = "a mock log message"

logger.use(mockLogger)

describe("logger", () => {
  it("should call the underlying logger's method successfully", () => {
    // Arrange
    const methods = ["info", "warn", "error"]

    // Act
    methods.forEach((method) => {
      logger[method as "info" | "warn" | "error"](MOCK_LOG_MESSAGE)
    })

    // Assert
    expect(mockLog).toHaveBeenCalledTimes(methods.length)
    expect(mockLog).toHaveBeenCalledWith(MOCK_LOG_MESSAGE)
  })
})
