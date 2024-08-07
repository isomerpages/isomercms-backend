import express from "express"
import mockAxios from "jest-mock-axios"
import request from "supertest"

import { config } from "@config/config"

import { User, Whitelist, Otp } from "@database/models"
import { generateRouter } from "@fixtures/app"
import UserSessionData from "@root/classes/UserSessionData"
import { mockIsomerUserId } from "@root/fixtures/sessionData"
import { UsersRouter as _UsersRouter } from "@root/routes/v2/authenticated/users"
import { getUsersService } from "@services/identity"
import { sequelize } from "@tests/database"

// NOTE: There is a module mock set up but as this is an integration test,
// we try to avoid mocking as much as possible and use the actual module instead.
// This is acceptable because, unlike axios, it does not hit the network.
jest.unmock("otplib")

const mockValidEmail = "open@up.gov.sg"
const mockInvalidEmail = "stay@home.sg"
const mockUnwhitelistedEmail = "blacklisted@sad.sg"
const mockWhitelistedDomain = ".gov.sg"
const mockExactWhitelistedEmail = "exact@whitelisted.sg"
const mockValidNumber = "92341234"
const mockInvalidNumber = "00000000"
const maxNumOfOtpAttempts = config.get("auth.maxNumOtpAttempts")
const mockInvalidOtp = "000000"

const UsersService = getUsersService(sequelize)

const UsersRouter = new _UsersRouter({
  usersService: UsersService,
})
const usersSubrouter = UsersRouter.getRouter()

// Set up express with defaults and use the router under test
const subrouter = express()
// As we set certain properties on res.locals when the user signs in using github
// In order to do integration testing, we must expose a middleware
// that allows us to set this properties also
subrouter.use((req, res, next) => {
  const userSessionData = new UserSessionData({
    isomerUserId: mockIsomerUserId,
    githubId: req.body.githubId,
    email: req.body.email,
  })
  res.locals.userSessionData = userSessionData
  next()
})
subrouter.use(usersSubrouter)
const app = generateRouter(subrouter)

const extractEmailOtp = (emailBody: string): string => {
  const startIdx = emailBody.search("<b>")
  const endIdx = emailBody.search("</b>")
  return emailBody.slice(startIdx + 3, endIdx)
}

const extractMobileOtp = (mobileBody: string): string =>
  mobileBody.slice(12, 12 + 6)

const mockSendMailResponse = {
  data: {
    id: "1",
    recipient: mockValidEmail,
    status: "ACCEPTED",
  },
  status: 201,
  statusText: "Created",
}

const mockVerifyMailResponse = {
  data: {
    id: "1",
    recipient: mockValidEmail,
    status: "DELIVERED",
  },
  status: 200,
  statusText: "Ok",
}

// NOTE: This set of tests will encounter warnings for remaining asynchronous operations
// after the tests are complete. This is because MailClient.ts has a separate routine
// for verification of email statuses which has a delay of 1 minute. Waiting for that
// long will cause the tests to timeout. useFakeTimers() have been experimented with,
// but behaviour seem to be buggy and cause all tests to fail. Hence, currently sticking
// with the warning and letting the tests pass.
describe("Users Router", () => {
  beforeAll(async () => {
    // We need to force the relevant tables to start from a clean slate
    // Otherwise, some tests may fail due to the auto-incrementing IDs
    // not starting from 1
    await User.sync({ force: true })
    await Whitelist.sync({ force: true })
  })

  afterEach(() => {
    jest.resetAllMocks()
    mockAxios.reset()
  })

  afterAll(async () => {
    await User.sync({ force: true })
    await Whitelist.sync({ force: true })
  })

  describe("/email/otp", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock user don't interfere with each other
      await Whitelist.destroy({
        where: { email: mockWhitelistedDomain },
      })
      await Whitelist.destroy({
        where: { email: mockExactWhitelistedEmail },
      })
    })
    it("should return 200 when email sending is successful", async () => {
      // Arrange
      const expected = 200
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 200 when the email is an exact entry in the whitelist", async () => {
      // Arrange
      const expected = 200
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockExactWhitelistedEmail })

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockExactWhitelistedEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no email in the request body", async () => {
      // Arrange
      const expected = 400
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)

      // Act
      const actual = await request(app).post("/email/otp").send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the email is empty", async () => {
      // Arrange
      const expected = 400
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)

      // Act
      const actual = await request(app).post("/email/otp").send({ email: "" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the email is not in the whitelist", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockUnwhitelistedEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the email is a partial match of a exact entry in the whitelist", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockExactWhitelistedEmail })

      // Act
      const actual = await request(app)
        .post("/email/otp")
        .send({
          email: `evil.${mockExactWhitelistedEmail}`,
        })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
    it("should return 400 when the email is of an invalid form", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockInvalidEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })

  describe("/email/verifyOtp", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock user don't interfere with each other
      await User.destroy({
        where: { id: mockIsomerUserId },
        force: true, // hard delete user record to prevent the unique constraint from being violated
      })
      await Whitelist.destroy({
        where: { email: mockWhitelistedDomain },
      })
      await Otp.destroy({
        where: { email: mockValidEmail },
      })
    })

    it("should return 200 when the otp is correct", async () => {
      // Arrange
      const expected = 200
      let otp = ""
      mockAxios.post.mockImplementationOnce((_, email) => {
        otp = extractEmailOtp(JSON.stringify(email))
        // NOTE: We are casting as `any` here because
        // the underlying type used by `mockAxios` is
        // not a promise and we do not have the type installed.
        return mockSendMailResponse as any
      })
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)

      await User.create({ id: mockIsomerUserId })
      await Whitelist.create({ email: mockWhitelistedDomain })

      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp,
      })
      const updatedUser = await User.findOne({
        where: {
          id: mockIsomerUserId,
        },
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(updatedUser?.email).toBe(mockValidEmail)
    })

    it("should return 400 when the otp is wrong", async () => {
      // Arrange
      const expected = 400
      const wrongOtp = "123456"
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: wrongOtp,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no otp", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: "",
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when otp is undefined", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: undefined,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should only ensure the latest email otp is valid", async () => {
      // Arrange
      const expected = 200
      let otp
      mockAxios.post.mockImplementation((_: any, email: any) => {
        otp = extractEmailOtp(JSON.stringify(email))
        // NOTE: We are casting as `any` here because
        // the underlying type used by `mockAxios` is
        // not a promise and we do not have the type installed.
        return mockSendMailResponse as any
      })
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)

      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp,
      })
      const oldOtp = otp

      // Assert
      expect(actual.statusCode).toBe(expected)

      // Arrange
      const newExpected = 400
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      const newActual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: oldOtp,
      })

      // Assert
      expect(oldOtp).not.toBe(otp)
      expect(newActual.statusCode).toBe(newExpected)
    })

    it("should return 400 when max number of email otp attempts is reached with correct error message", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      const numOfAttempts = 10 // arbitrary number > maxNumOfAttempts
      for (let i = 1; i <= numOfAttempts; i++) {
        const actual = await request(app).post("/email/verifyOtp").send({
          email: mockValidEmail,
          otp: mockInvalidOtp,
        })
        const otpEntry = await Otp.findOne({
          where: { email: mockValidEmail },
        })

        // Assert
        expect(actual.statusCode).toBe(expected)

        if (i <= maxNumOfOtpAttempts) {
          expect(otpEntry?.attempts).toBe(i)
          expect(actual.body.message).toBe("OTP is not valid")
        } else {
          expect(otpEntry?.attempts).toBe(maxNumOfOtpAttempts)
          expect(actual.body.message).toBe("Max number of attempts reached")
        }
      }
    })

    it("should reset otp attempts when new email otp is requested", async () => {
      // Arrange
      mockAxios.post.mockResolvedValueOnce(mockSendMailResponse)
      mockAxios.get.mockResolvedValue(mockVerifyMailResponse)
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      const numOfAttempts = 10 // arbitrary number > maxNumOfAttempts
      for (let i = 1; i <= numOfAttempts; i++) {
        await request(app).post("/email/verifyOtp").send({
          email: mockValidEmail,
          otp: mockInvalidOtp,
        })
      }

      let otpEntry = await Otp.findOne({
        where: { email: mockValidEmail },
      })

      // Assert
      expect(otpEntry?.attempts).toBe(maxNumOfOtpAttempts)

      // Request for new otp and ensure attempts are reset
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })
      otpEntry = await Otp.findOne({
        where: { email: mockValidEmail },
      })

      // Assert
      expect(otpEntry?.attempts).toBe(0)
    })
  })

  describe("/mobile/otp", () => {
    it("should return 200 when sms sending is successful", async () => {
      // Arrange
      const expected = 200
      mockAxios.post.mockResolvedValueOnce(200)

      // Act
      const actual = await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no mobile number in the request body", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/mobile/otp").send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the mobile number is empty", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/mobile/otp").send({ mobile: "" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the mobile number is of an invalid form", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/mobile/otp").send({
        email: mockInvalidNumber,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })

  describe("/mobile/verifyOtp", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock user don't interfere with each other
      await User.destroy({
        where: { id: mockIsomerUserId },
        force: true, // hard delete user record to prevent the unique constraint from being violated
      })
    })

    it("should return 200 when the otp is correct", async () => {
      // Arrange
      const expected = 200
      let otp = ""
      mockAxios.post.mockImplementationOnce((_, sms) => {
        otp = extractMobileOtp(sms.body)
        return sms
      })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp,
      })
      const updatedUser = await User.findOne({
        where: {
          id: mockIsomerUserId,
        },
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(updatedUser?.contactNumber).toBe(mockValidNumber)
    })

    it("should return 400 when the otp is wrong", async () => {
      // Arrange
      const expected = 400
      const wrongOtp = "123456"
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp: wrongOtp,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the request body format is wrong", async () => {
      // Arrange
      const expected = 400
      const otp = "123456"
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app)
        .post("/mobile/verifyOtp")
        .send({
          mobile: [mockValidNumber, "98765432"],
          otp,
        })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no otp", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp: "",
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when otp is undefined", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp: undefined,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should only ensure the latest mobile otp is valid", async () => {
      // Arrange
      const expected = 200
      let otp
      mockAxios.post.mockImplementation((_: any, sms: any) => {
        otp = extractMobileOtp(sms.body)
        return sms
      })
      await Whitelist.create({ email: mockWhitelistedDomain })
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      // Act
      const actual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp,
      })
      const oldOtp = otp

      // Assert
      expect(actual.statusCode).toBe(expected)

      // Arrange
      const newExpected = 400
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      const newActual = await request(app).post("/mobile/verifyOtp").send({
        mobile: mockValidNumber,
        otp: oldOtp,
      })

      // Assert
      expect(oldOtp).not.toBe(otp)
      expect(newActual.statusCode).toBe(newExpected)
    })

    it("should return 400 when max number of mobile otp attempts is reached with correct error message", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      const numOfAttempts = 10 // arbitrary number > maxNumOfAttempts
      for (let i = 1; i <= numOfAttempts; i++) {
        const actual = await request(app).post("/mobile/verifyOtp").send({
          mobile: mockValidNumber,
          otp: mockInvalidOtp,
        })
        const otpEntry = await Otp.findOne({
          where: { mobileNumber: mockValidNumber },
        })

        // Assert
        expect(actual.statusCode).toBe(expected)

        if (i <= maxNumOfOtpAttempts) {
          expect(otpEntry?.attempts).toBe(i)
          expect(actual.body.message).toBe("OTP is not valid")
        } else {
          expect(otpEntry?.attempts).toBe(maxNumOfOtpAttempts)
          expect(actual.body.message).toBe("Max number of attempts reached")
        }
      }
    })

    it("should reset otp attempts when new mobile otp is requested", async () => {
      // Arrange
      mockAxios.post.mockResolvedValue(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })

      const numOfAttempts = 10 // arbitrary number > maxNumOfAttempts
      for (let i = 1; i <= numOfAttempts; i++) {
        await request(app).post("/mobile/verifyOtp").send({
          mobile: mockValidNumber,
          otp: mockInvalidOtp,
        })
      }

      let otpEntry = await Otp.findOne({
        where: { mobileNumber: mockValidNumber },
      })

      // Assert
      expect(otpEntry?.attempts).toBe(maxNumOfOtpAttempts)

      // Request for new otp and ensure attempts are reset
      await request(app).post("/mobile/otp").send({
        mobile: mockValidNumber,
      })
      otpEntry = await Otp.findOne({
        where: { mobileNumber: mockValidNumber },
      })

      // Assert
      expect(otpEntry?.attempts).toBe(0)
    })
  })
})
