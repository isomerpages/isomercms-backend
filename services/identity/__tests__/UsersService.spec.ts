import { Sequelize } from "sequelize-typescript"
import { ModelStatic } from "sequelize/types"

import { User } from "@root/database/models"

import SmsClient from "../SmsClient"
import TotpGenerator from "../TotpGenerator"
import _UsersService from "../UsersService"

const MockOtp = {
  generate: jest.fn(),
  getExpiryMinutes: jest.fn(),
  verify: jest.fn(),
}
const MockMailer = {
  sendMail: jest.fn(),
}
const MockSmsClient = {
  sendSms: jest.fn(),
}
const MockRepository = {
  findOne: jest.fn(),
  update: jest.fn(),
  findOrCreate: jest.fn(),
}
const MockSequelize = {
  transaction: jest.fn((closure) => closure("transaction")),
}

const UsersService = new _UsersService({
  otp: (MockOtp as unknown) as TotpGenerator,
  mailer: MockMailer,
  smsClient: (MockSmsClient as unknown) as SmsClient,
  repository: (MockRepository as unknown) as ModelStatic<User>,
  sequelize: (MockSequelize as unknown) as Sequelize,
})

const mockEmail = "someone@tech.gov.sg"
const mockGithubId = "sudowoodo"
let DOMAIN_WHITELIST: string | undefined

describe("User Service", () => {
  beforeAll(async () => {
    // NOTE: We set the DOMAIN_WHITELIST env var here explicitly
    // to prevent differing test results between devs
    DOMAIN_WHITELIST = process.env.DOMAIN_WHITELIST
    process.env.DOMAIN_WHITELIST = ""
  })

  afterAll(() => {
    process.env.DOMAIN_WHITELIST = DOMAIN_WHITELIST
  })

  afterEach(() => jest.clearAllMocks())

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

  it("should return the result of calling the findOrCreate method by githubId on the db model", async () => {
    // Arrange
    const expected = "user1"
    MockRepository.findOrCreate.mockResolvedValue([expected])

    // Act
    const actual = await UsersService.findOrCreate(mockGithubId)

    // Assert
    expect(actual).toBe(expected)
    expect(MockRepository.findOrCreate).toBeCalledWith({
      where: { githubId: mockGithubId },
    })
  })

  it("should return the result of calling the underlying findOrCreate method on the db model and set the lastLoggedIn", async () => {
    // Arrange
    const mockDbUser = {
      save: jest.fn().mockReturnThis(),
      githubId: mockGithubId,
    }
    MockRepository.findOrCreate.mockResolvedValue([mockDbUser])

    // Act
    const actual = await UsersService.login(mockGithubId)

    // Assert
    expect(actual.lastLoggedIn).toBeDefined()
    expect(actual.githubId).toBe(mockGithubId)
  })

  it("should not allow gov.sg emails when no whitelist is specified", () => {
    // Arrange
    const expected = false
    // NOTE: This ends with gov.sg not .gov.sg (lacks a dot after the @)
    const emailWithoutDot = "user@gov.sg"

    // Act
    const actual = UsersService.canSendEmailOtp(emailWithoutDot)

    // Assert
    expect(actual).toBe(expected)
  })

  it("should allow not .gov.sg emails when whitelist is specified and does not contain .gov.sg", () => {
    // Arrange
    const expected = false
    const newWhitelist = "accenture.com; ntu.edu.sg"
    const curWhitelist = process.env.DOMAIN_WHITELIST
    process.env.DOMAIN_WHITELIST = newWhitelist
    // NOTE: Need to reinitialise to force the new whitelist to be used
    const NewUserService = new _UsersService({
      otp: (MockOtp as unknown) as TotpGenerator,
      mailer: MockMailer,
      smsClient: (MockSmsClient as unknown) as SmsClient,
      repository: (MockRepository as unknown) as ModelStatic<User>,
      sequelize: (MockSequelize as unknown) as Sequelize,
    })

    // Act
    const actual = NewUserService.canSendEmailOtp(mockEmail)

    // Assert
    expect(actual).toBe(expected)
    process.env.DOMAIN_WHITELIST = curWhitelist
  })
})
