jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}))
jest.mock("uuid/v4")
jest.mock("@utils/jwt-utils")

const axios = require("axios")
const uuid = require("uuid/v4")

const jwtUtils = require("@utils/jwt-utils")

const validateStatus = require("@root/utils/axios-utils")
const { AuthService } = require("@services/utilServices/AuthService")

describe("Auth Service", () => {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

  const accessToken = "test-token"

  const state = "state"
  const token = "token"
  const signedToken = "signedToken"
  const csrfState = "csrfState"
  const userId = "user"
  const mockEmail = "email"
  const mockContactNumber = "12345678"
  const mockIsomerUserId = "isomer-user"
  const mockUserId = "user"

  const mockUsersService = {
    login: jest.fn().mockImplementation(() => mockIsomerUserId),
    findByGitHubId: jest.fn().mockImplementation(() => ({
      email: mockEmail,
      contactNumber: mockContactNumber,
    })),
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

  describe("getGithubAuthToken", () => {
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
        service.getGithubAuthToken({ csrfState, code: "code", state })
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

  describe("getUserInfo", () => {
    it("should be able to retrieve user info", async () => {
      axios.get.mockImplementation(() => ({
        data: {
          login: userId,
        },
      }))
      await expect(service.getUserInfo({ accessToken })).resolves.toEqual({
        userId,
        email: mockEmail,
        contactNumber: mockContactNumber,
      })
      expect(mockUsersService.findByGitHubId).toHaveBeenCalledWith(userId)
    })
  })
})
