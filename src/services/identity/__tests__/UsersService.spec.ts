import { ModelStatic } from "sequelize/types"
import { Sequelize } from "sequelize-typescript"

import { config } from "@root/config/config"
import { Otp, User, Whitelist } from "@root/database/models"
import { BadRequestError } from "@root/errors/BadRequestError"
import SmsClient from "@services/identity/SmsClient"
import TotpGenerator from "@services/identity/TotpGenerator"
import MailClient from "@services/utilServices/MailClient"

import OtpService from "../OtpService"
import _UsersService from "../UsersService"

const MockOtpService = {
  generateLoginOtpWithHash: jest.fn(),
  verifyOtp: jest.fn(),
}

const MockMailer = ({
  sendMail: jest.fn(),
} as unknown) as MailClient

const MockSmsClient = {
  sendSms: jest.fn(),
}

const MockRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  findOrCreate: jest.fn(),
  upsert: jest.fn(),
}

const MockSequelize = {
  transaction: jest.fn((closure) => closure("transaction")),
  query: jest.fn(),
}

const MockWhitelist = {
  findAll: jest.fn(),
}

let dbAttempts = 0
let dbAttemptsByIp: Record<string, number> = {}

const futureDate = new Date(Date.now() + 60 * 60 * 1000)

const MockOtp = {
  findOne: jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: 1,
      email: mockEmail,
      hashedOtp: "hashed",
      attempts: dbAttempts,
      attemptsByIp: { ...dbAttemptsByIp },
      expiresAt: futureDate,
      destroy: jest.fn(),
    })
  ),
  update: jest.fn().mockImplementation((values: any, options: any) => {
    if (options?.where?.attempts !== dbAttempts) return Promise.resolve([0])

    dbAttempts = values.attempts
    dbAttemptsByIp = { ...(values.attemptsByIp || {}) }
    return Promise.resolve([1])
  }),
}

const UsersService = new _UsersService({
  mailer: (MockMailer as unknown) as MailClient,
  smsClient: (MockSmsClient as unknown) as SmsClient,
  repository: (MockRepository as unknown) as ModelStatic<User>,
  sequelize: (MockSequelize as unknown) as Sequelize,
  whitelist: (MockWhitelist as unknown) as ModelStatic<Whitelist>,
  otpService: (MockOtpService as unknown) as OtpService,
  otpRepository: (MockOtp as unknown) as ModelStatic<Otp>,
})

const mockEmail = "someone@tech.gov.sg"
const mockGithubId = "sudowoodo"

describe("User Service", () => {
  afterEach(() => {
    jest.clearAllMocks()
    dbAttempts = 0
    dbAttemptsByIp = {}
  })

  it("should return the result of calling the findOne method by email on the db model", () => {
    // Arrange
    const expected = "user1"
    MockRepository.findOne.mockResolvedValue(expected)

    // Act
    const actual = UsersService.findByEmail(mockEmail)

    // Assert
    expect(actual).resolves.toBe(expected)
    expect(MockRepository.findOne).toBeCalledWith({
      where: { email: mockEmail },
    })
  })

  describe("verifyOtp per-IP behavior", () => {
    const maxAttempts = config.get("auth.maxNumOtpAttempts")
    const wrongOtp = "000000"

    it("increments attempts for provided IP and returns invalid until max", async () => {
      (MockOtpService.verifyOtp as jest.Mock).mockResolvedValue(false)
      const ip = "1.1.1.1"

      for (let i = 1; i <= maxAttempts; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await UsersService.verifyEmailOtp(mockEmail, wrongOtp, ip)
        expect(result.isErr()).toBe(true)
        const err = result._unsafeUnwrapErr()
        expect(err).toBeInstanceOf(BadRequestError)
        expect((err as BadRequestError).message).toBe("OTP is not valid")
      }

      // The next attempt should return max attempts error
      const result = await UsersService.verifyEmailOtp(mockEmail, wrongOtp, ip)
      expect(result.isErr()).toBe(true)
      const err = result._unsafeUnwrapErr()
      expect(err).toBeInstanceOf(BadRequestError)
      expect((err as BadRequestError).message).toBe(
        "Max number of attempts reached"
      )

      expect(MockOtp.update).toHaveBeenCalled()
      expect(dbAttemptsByIp[ip]).toBe(maxAttempts) // max attempts reached
    })

    it("uses 'unknown' bucket when clientIp is missing", async () => {
      (MockOtpService.verifyOtp as jest.Mock).mockResolvedValue(false)

      const result = await UsersService.verifyEmailOtp(mockEmail, wrongOtp)
      expect(result.isErr()).toBe(true)
      result._unsafeUnwrapErr() // ensure unwrap doesn't throw
      expect(dbAttemptsByIp.unknown).toBe(1)
    })

    it("tracks per-IP separately", async () => {
      (MockOtpService.verifyOtp as jest.Mock).mockResolvedValue(false)
      const ipA = "1.1.1.1"
      const ipB = "2.2.2.2"

      await UsersService.verifyEmailOtp(mockEmail, wrongOtp, ipA)
      await UsersService.verifyEmailOtp(mockEmail, wrongOtp, ipA)
      await UsersService.verifyEmailOtp(mockEmail, wrongOtp, ipB)

      expect(dbAttemptsByIp[ipA]).toBe(2)
      expect(dbAttemptsByIp[ipB]).toBe(1)
    })
  })

  it("should return the result of calling the findOne method by githubId on the db model", () => {
    // Arrange
    const expected = "user1"
    MockRepository.findOne.mockResolvedValue(expected)

    // Act
    const actual = UsersService.findByGitHubId(mockGithubId)

    // Assert
    expect(actual).resolves.toBe(expected)
    expect(MockRepository.findOne).toBeCalledWith({
      where: { githubId: mockGithubId },
    })
  })

  it("should return the result of calling the update method by githubId on the db model", async () => {
    // Arrange
    const mockUser = { email: mockEmail }

    // Act
    await UsersService.updateUserByGitHubId(mockGithubId, mockUser)

    // Assert
    expect(MockRepository.update).toBeCalledWith(mockUser, {
      where: { githubId: mockGithubId },
    })
  })

  it("should call `upsert` on the db model and set the lastLoggedIn", async () => {
    // Arrange
    const startTime = Date.now()
    const mockDbUser = {
      githubId: mockGithubId,
    }
    MockRepository.upsert.mockResolvedValue([mockDbUser])

    // Act
    const actual = await UsersService.login(mockGithubId)

    // Assert
    expect(MockRepository.upsert).toBeCalledWith({
      githubId: mockGithubId,
      lastLoggedIn: expect.any(Date),
    })
    expect(actual.githubId).toBe(mockGithubId)
  })

  describe("canSendEmailOtp", () => {
    it("should return true when the db query returns a record", async () => {
      // Arrange
      const expected = true
      MockSequelize.query.mockResolvedValueOnce([{ email: ".gov.sg" }])

      // Act
      const actual = await UsersService.canSendEmailOtp(mockEmail)

      // Assert
      expect(actual).toBe(expected)
    })

    it("should return false when the db query returns no record", async () => {
      // Arrange
      const expected = false
      // NOTE: This ends with gov.sg not .gov.sg (lacks a dot after the @)
      const emailWithoutDot = "user@gov.sg"
      MockSequelize.query.mockResolvedValueOnce([])

      // Act
      const actual = await UsersService.canSendEmailOtp(emailWithoutDot)

      // Assert
      expect(actual).toBe(expected)
    })
  })
})
