jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}))
jest.mock("uuid/v4")
jest.mock("@utils/jwt-utils")

const axios = require("axios")
const uuid = require("uuid/v4")

const { AuthError } = require("@errors/AuthError")
const { BadRequestError } = require("@errors/BadRequestError")

const validateStatus = require("@utils/axios-utils")
const jwtUtils = require("@utils/jwt-utils")

const {
  mockUserWithSiteSessionData,
  mockGithubId,
  mockEmail,
  mockIsomerUserId,
  mockGithubId: mockUserId,
  mockSessionDataEmailUser,
} = require("@fixtures/sessionData")
const { AuthService } = require("@services/utilServices/AuthService")

describe("Auth Service", () => {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

  const accessToken = "test-token"

  const state = "state"
  const token = "token"
  const signedToken = "signedToken"
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
    verifyOtp: jest.fn(),
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
      jwtUtils.signToken.mockImplementation(() => signedToken)
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
      ).resolves.toEqual(signedToken)

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
      mockUsersService.verifyOtp.mockImplementationOnce(() => true)
      jwtUtils.signToken.mockImplementationOnce(() => signedToken)

      await expect(
        service.verifyOtp({ email: mockEmail, otp: mockOtp })
      ).resolves.toEqual(signedToken)
      expect(mockUsersService.verifyOtp).toHaveBeenCalledWith(
        mockEmail,
        mockOtp
      )
      expect(mockUsersService.loginWithEmail).toHaveBeenCalledWith(mockEmail)
    })

    it("should throw an error if otp is incorrect", async () => {
      mockUsersService.verifyOtp.mockImplementationOnce(() => false)

      await expect(
        service.verifyOtp({ email: mockEmail, otp: mockOtp })
      ).rejects.toThrow(BadRequestError)
      expect(mockUsersService.verifyOtp).toHaveBeenCalledWith(
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
