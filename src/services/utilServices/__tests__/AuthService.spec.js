const { validateStatus } = require("@utils/axios-utils")

const { okAsync, errAsync } = require("neverthrow")

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}))
jest.mock("uuid/v4")
jest.mock("@utils/jwt-utils")

const axios = require("axios")
const uuid = require("uuid/v4")

const { config } = require("@config/config")

const { AuthError } = require("@errors/AuthError")
const { BadRequestError } = require("@errors/BadRequestError")

const jwtUtils = require("@utils/jwt-utils").default

const {
  mockUserWithSiteSessionData,
  mockGithubId,
  mockEmail,
  mockIsomerUserId,
  mockGithubId: mockUserId,
  mockSessionDataEmailUser,
} = require("@fixtures/sessionData")
const { OtpType } = require("@root/services/identity/UsersService")
const { AuthService } = require("@services/utilServices/AuthService")

describe("Auth Service", () => {
  const CLIENT_ID = config.get("github.clientId")
  const CLIENT_SECRET = config.get("github.clientSecret")
  const REDIRECT_URI = config.get("github.redirectUri")

  const accessToken = "test-token"

  const state = "state"
  const token = "token"
  const signedGithubToken = {
    accessToken: token,
    githubId: mockGithubId,
  }
  const signedEmailToken = {
    email: mockEmail,
    isomerUserId: mockIsomerUserId,
  }
  const csrfState = "csrfState"
  const mockContactNumber = "12345678"

  const mockUsersService = {
    login: jest.fn().mockImplementation(() => mockIsomerUserId),
    findByGitHubId: jest.fn().mockImplementation(() => ({
      email: mockEmail,
      contactNumber: mockContactNumber,
    })),
    findByEmail: jest
      .fn()
      .mockImplementation(() => ({ contactNumber: mockContactNumber })),
    canSendEmailOtp: jest.fn(),
    sendEmailOtp: jest.fn(),
    verifyEmailOtp: jest.fn(),
    loginWithEmail: jest
      .fn()
      .mockImplementation(() => ({ id: mockIsomerUserId, email: mockEmail })),
  }
  const service = new AuthService({ usersService: mockUsersService })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getAuthRedirectDetails", () => {
    it("Able to return redirectUrl and cookieToken when getting details", async () => {
      uuid.mockImplementation(() => state)
      jwtUtils.signToken.mockImplementation(() => token)

      await expect(service.getAuthRedirectDetails()).resolves.toMatchObject({
        redirectUrl: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&state=${state}&scope=repo`,
        cookieToken: token,
      })
    })
  })

  describe("getUserInfoFromGithubAuth", () => {
    it("Retrieves the Github auth token", async () => {
      const params = {
        code: "code",
        redirect_uri: REDIRECT_URI,
        state,
      }

      uuid.mockImplementation(() => state)
      jwtUtils.verifyToken.mockImplementation(() => ({ state }))
      jwtUtils.encryptToken.mockImplementation(() => token)
      axios.post.mockImplementation(() => ({
        data: `access_token=${accessToken}`,
      }))
      axios.get.mockImplementation(() => ({
        data: {
          login: mockUserId,
        },
      }))

      await expect(
        service.getUserInfoFromGithubAuth({ csrfState, code: "code", state })
      ).resolves.toEqual(signedGithubToken)

      expect(axios.post).toHaveBeenCalledWith(
        "https://github.com/login/oauth/access_token",
        params,
        {
          auth: {
            username: CLIENT_ID,
            password: CLIENT_SECRET,
          },
        }
      )
      expect(axios.get).toHaveBeenCalledWith(`https://api.github.com/user`, {
        validateStatus,
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
      })
      expect(mockUsersService.login).toHaveBeenCalledWith(mockUserId)
    })
  })

  describe("sendOtp", () => {
    it("should be able to send otp for whitelisted users", async () => {
      mockUsersService.canSendEmailOtp.mockImplementationOnce(() => true)

      await expect(service.sendOtp(mockEmail)).resolves.not.toThrow()
      expect(mockUsersService.canSendEmailOtp).toHaveBeenCalledWith(mockEmail)
      expect(mockUsersService.sendEmailOtp).toHaveBeenCalledWith(mockEmail)
    })

    it("should throw an error for non-whitelisted users", async () => {
      mockUsersService.canSendEmailOtp.mockImplementationOnce(() => false)

      await expect(service.sendOtp(mockEmail)).rejects.toThrow(AuthError)
      expect(mockUsersService.canSendEmailOtp).toHaveBeenCalledWith(mockEmail)
    })
  })

  describe("verifyOtp", () => {
    const mockOtp = "123456"
    it("should be able to verify otp, login, and return token if correct", async () => {
      mockUsersService.verifyEmailOtp.mockImplementationOnce(() =>
        okAsync(true)
      )
      mockUsersService.loginWithEmail.mockResolvedValueOnce({
        id: mockIsomerUserId,
        email: mockEmail,
      })
      jwtUtils.signToken.mockImplementationOnce(() => signedEmailToken)

      const result = await service.verifyOtp({ email: mockEmail, otp: mockOtp })

      expect(result._unsafeUnwrap()).toEqual(signedEmailToken)
      expect(mockUsersService.verifyEmailOtp).toHaveBeenCalledWith(
        mockEmail,
        mockOtp
      )
      expect(mockUsersService.loginWithEmail).toHaveBeenCalledWith(mockEmail)
    })

    it("should throw an error if otp is incorrect", async () => {
      mockUsersService.verifyEmailOtp.mockImplementationOnce(() =>
        errAsync(new BadRequestError("Invalid OTP"))
      )

      await expect(
        service.verifyOtp({ email: mockEmail, otp: mockOtp })
      ).rejects.toThrow(BadRequestError)
      expect(mockUsersService.verifyEmailOtp).toHaveBeenCalledWith(
        mockEmail,
        mockOtp
      )
    })
  })

  describe("getUserInfo", () => {
    it("should be able to retrieve user info for github users", async () => {
      axios.get.mockImplementation(() => ({
        data: {
          login: mockGithubId,
        },
      }))
      await expect(
        service.getUserInfo(mockUserWithSiteSessionData)
      ).resolves.toEqual({
        userId: mockGithubId,
        email: mockEmail,
        contactNumber: mockContactNumber,
      })
      expect(mockUsersService.findByGitHubId).toHaveBeenCalledWith(mockGithubId)
    })

    it("should be able to retrieve user info for email users", async () => {
      await expect(
        service.getUserInfo(mockSessionDataEmailUser)
      ).resolves.toEqual({
        email: mockEmail,
        contactNumber: mockContactNumber,
      })
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockEmail)
    })
  })
})
