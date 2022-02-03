const axios = require("axios")
const uuid = require("uuid/v4")

const jwtUtils = require("@utils/jwt-utils")

const validateStatus = require("@root/utils/axios-utils")

jest.mock("axios")
jest.mock("uuid/v4")
jest.mock("@utils/jwt-utils")
describe("Auth Service", () => {
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

  const accessToken = "test-token"

  const state = "state"
  const token = "token"
  const signedToken = "signedToken"
  const csrfState = "csrfState"
  const userId = "user"

  const { AuthService } = require("@services/utilServices/AuthService")

  const service = new AuthService()

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
      uuid.mockImplementation(() => state)
      jwtUtils.verifyToken.mockImplementation(() => token)
      jwtUtils.decodeToken.mockImplementation(() => ({ state }))
      jwtUtils.encryptToken.mockImplementation(() => token)
      jwtUtils.signToken.mockImplementation(() => signedToken)
      axios.post.mockImplementation(() => ({
        data: `access_token=${accessToken}`,
      }))
      axios.get.mockImplementation(() => ({
        data: {
          login: "login",
        },
      }))
      // replace with
      const params = {
        code: "code",
        redirect_uri: REDIRECT_URI,
        state,
      }
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
    })
  })

  describe("getUserId", () => {
    it("Able to retrieve user id", async () => {
      axios.get.mockImplementation(() => ({
        data: {
          login: userId,
        },
      }))
      await expect(service.getUserId({ accessToken })).resolves.toEqual(userId)
    })
  })
})
