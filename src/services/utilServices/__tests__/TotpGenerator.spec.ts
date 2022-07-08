import { totp as mockTotp } from "@mocks/otplib"
import _TotpGenerator from "@services/utilServices/TotpGenerator"

const mockSecret = "some secret"
const TotpGenerator = new _TotpGenerator({
  secret: mockSecret,
  expiry: 5,
})
const mockEmail = "someone@gov.sg"

describe("TotpGenerator", () => {
  afterEach(() => jest.clearAllMocks())

  it("should generate the otp successfully when all parameters are valid", () => {
    // Arrange
    const secret = TotpGenerator.getSecret(mockEmail)
    const expected = "999"
    mockTotp.generate.mockReturnValue(expected)

    // Act
    const actual = TotpGenerator.generate(mockEmail)

    // Assert
    expect(actual).toBe(expected)
    expect(mockTotp.generate).toBeCalledWith(secret)
  })

  it("should call the generator to verify the otp", () => {
    // Arrange
    const secret = TotpGenerator.getSecret(mockEmail)
    const expected = true
    const mockOtp = "999"
    mockTotp.verify.mockReturnValue(expected)

    // Act
    const actual = TotpGenerator.verify(mockEmail, mockOtp)

    // Assert
    expect(actual).toBe(expected)
    expect(mockTotp.verify).toBeCalledWith({
      token: mockOtp,
      secret,
    })
  })

  it("should call the underlying clone method of the generator when created", () => {
    // Arrange
    const mockExpiry = 1
    const step = mockExpiry * 60
    const window = [1, 0]

    // Act
    const _ = new _TotpGenerator({
      secret: mockSecret,
      expiry: mockExpiry,
    })

    // Assert
    expect(mockTotp.clone).toBeCalledWith({
      step,
      window,
    })
  })

  it("should coerce NaN to 5 for the expiry value", () => {
    // Arrange
    // NOTE: NaN is a valid value for numeric types
    const mockInvalidExpiry = NaN
    const step = 5 * 60
    const window = [1, 0]

    // Act
    const _ = new _TotpGenerator({
      secret: mockSecret,
      expiry: mockInvalidExpiry,
    })

    // Assert
    expect(mockTotp.clone).toBeCalledWith({
      step,
      window,
    })
  })
})
