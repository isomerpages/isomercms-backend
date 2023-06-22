import { AuthError } from "../AuthError"

describe("errors", () => {
  it("should conform to the expected interface even when it is not the base error", () => {
    // Arrange
    const err = new AuthError()

    // Assert
    expect(err.name).toBe("AuthError")
    expect(err.meta).toBeEmptyObject()
    expect(err.message).toBeString()
  })
})
