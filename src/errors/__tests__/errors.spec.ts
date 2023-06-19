import { AuthError } from "../AuthError"
import { IsomerInternalError } from "../IsomerError"

describe("errors", () => {
  it("should conform to the expected interface even when it is not the base error", () => {
    // Arrange
    const err = new AuthError()

    // Assert
    expect(err).toBe<IsomerInternalError>({ code: "AuthError", message: "" })
    expect(err.code).toBe("AuthError")
    expect(err.message).toBeDefined()
  })
})
