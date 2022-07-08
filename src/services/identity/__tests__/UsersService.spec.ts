import { Sequelize } from "sequelize-typescript"
import { ModelStatic } from "sequelize/types"

import { User, Whitelist } from "@root/database/models"
import MailClient from "@services/utilServices/MailClient"
import SmsClient from "@services/utilServices/SmsClient"
import TotpGenerator from "@services/utilServices/TotpGenerator"

import _UsersService from "../UsersService"

const MockOtp = {
  generate: jest.fn(),
  getExpiryMinutes: jest.fn(),
  verify: jest.fn(),
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
  findOrCreate: jest.fn(),
}
const MockSequelize = {
  transaction: jest.fn((closure) => closure("transaction")),
}
const MockWhitelist = {
  findAll: jest.fn(),
}

const UsersService = new _UsersService({
  otp: (MockOtp as unknown) as TotpGenerator,
  mailer: (MockMailer as unknown) as MailClient,
  smsClient: (MockSmsClient as unknown) as SmsClient,
  repository: (MockRepository as unknown) as ModelStatic<User>,
  sequelize: (MockSequelize as unknown) as Sequelize,
  whitelist: (MockWhitelist as unknown) as ModelStatic<Whitelist>,
})

const mockEmail = "someone@tech.gov.sg"
const mockGithubId = "sudowoodo"

describe("User Service", () => {
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

  it("should allow whitelisted emails", async () => {
    // Arrange
    const expected = true
    const mockWhitelistEntry = {
      email: ".gov.sg",
    }
    MockWhitelist.findAll.mockResolvedValueOnce([mockWhitelistEntry])

    // Act
    const actual = await UsersService.canSendEmailOtp(mockEmail)

    // Assert
    expect(actual).toBe(expected)
  })
  it("should not allow partial match of whitelisted emails", async () => {
    // Arrange
    const expected = false
    // NOTE: This ends with gov.sg not .gov.sg (lacks a dot after the @)
    const emailWithoutDot = "user@gov.sg"
    const mockWhitelistEntry = {
      email: ".gov.sg",
    }
    MockWhitelist.findAll.mockResolvedValueOnce([mockWhitelistEntry])

    // Act
    const actual = await UsersService.canSendEmailOtp(emailWithoutDot)

    // Assert
    expect(actual).toBe(expected)
  })

  it("should allow not .gov.sg emails when whitelist does not contain .gov.sg", async () => {
    // Arrange
    const expected = false
    const mockWhitelistEntries = [
      {
        email: "@accenture.com",
      },
      {
        email: ".edu.sg",
      },
    ]
    MockWhitelist.findAll.mockResolvedValueOnce(mockWhitelistEntries)

    // Act
    const actual = await UsersService.canSendEmailOtp(mockEmail)

    // Assert
    expect(actual).toBe(expected)
  })
})
