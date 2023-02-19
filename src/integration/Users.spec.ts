import express from "express"
import mockAxios from "jest-mock-axios"
import request from "supertest"

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
const mockGithubId = "i m a git"
const mockValidNumber = "92341234"
const mockInvalidNumber = "00000000"

const UsersService = getUsersService(sequelize)

const UsersRouter = new _UsersRouter({ usersService: UsersService })
const usersSubrouter = UsersRouter.getRouter()

// Set up express with defaults and use the router under test
const subrouter = express()
// As we set certain properties on res.locals when the user signs in using github
// In order to do integration testing, we must expose a middleware
// that allows us to set this properties also
subrouter.use((req, res, next) => {
  const userSessionData = new UserSessionData({
    isomerUserId: req.body.userId,
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

describe("Users Router", () => {
  afterEach(() => {
    jest.resetAllMocks()
    mockAxios.reset()
  })

  describe("/email/otp", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock user don't interfere with each other
      await Whitelist.destroy({
        where: { email: mockWhitelistedDomain },
      })
    })
    it("should return 200 when email sending is successful", async () => {
      // Arrange
      const expected = 200
      mockAxios.post.mockResolvedValueOnce(200)
      await Whitelist.create({ email: mockWhitelistedDomain })

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no email in the request body", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/email/otp").send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the email is empty", async () => {
      // Arrange
      const expected = 400

      // Act
      const actual = await request(app).post("/email/otp").send({ email: "" })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when the email is not in the whitelist", async () => {
      // Arrange
      const expected = 400
      await Whitelist.create({ email: mockWhitelistedDomain })

      // Act
      const actual = await request(app).post("/email/otp").send({
        email: mockUnwhitelistedEmail,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
    it("should return 400 when the email is of an invalid form", async () => {
      // Arrange
      const expected = 400

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
      mockAxios.post.mockImplementationOnce((_: any, email: any) => {
        otp = extractEmailOtp(email.body)
        return email
      })

      await User.create({ id: mockIsomerUserId })
      await Whitelist.create({ email: mockWhitelistedDomain })

      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp,
        userId: mockIsomerUserId,
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
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: wrongOtp,
        userId: mockIsomerUserId,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when there is no otp", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: "",
        userId: mockIsomerUserId,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })

    it("should return 400 when otp is undefined", async () => {
      // Arrange
      const expected = 400
      mockAxios.post.mockResolvedValueOnce(200)
      await User.create({ id: mockIsomerUserId })
      await request(app).post("/email/otp").send({
        email: mockValidEmail,
      })

      // Act
      const actual = await request(app).post("/email/verifyOtp").send({
        email: mockValidEmail,
        otp: undefined,
        userId: mockIsomerUserId,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
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
        userId: mockIsomerUserId,
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
        userId: mockIsomerUserId,
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
        userId: mockIsomerUserId,
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
        userId: mockIsomerUserId,
      })

      // Assert
      expect(actual.statusCode).toBe(expected)
    })
  })
})
