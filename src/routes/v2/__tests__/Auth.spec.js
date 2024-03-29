const express = require("express")
const session = require("express-session")
const { okAsync } = require("neverthrow")
const request = require("supertest")

const { config } = require("@config/config")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { mockUserSessionData, mockEmail } = require("@fixtures/sessionData")
const { rateLimiter } = require("@root/services/utilServices/RateLimiter")

const { CSRF_COOKIE_NAME, COOKIE_NAME, AuthRouter } = require("../auth")

const FRONTEND_URL = config.get("app.frontendUrl")
const csrfState = "csrfState"
const cookieToken = "cookieToken"
const MOCK_USER_ID = "userId"

describe("Unlinked Pages Router", () => {
  jest.mock("@logger/logger", {
    info: jest.fn(),
  })

  const mockAuthService = {
    getAuthRedirectDetails: jest.fn(),
    getUserInfoFromGithubAuth: jest.fn(),
    getUserInfo: jest.fn(),
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
  }
  const mockAuthenticationMiddleware = {
    verifyJwt: jest.fn().mockImplementation((req, res, next) => next()),
  }

  const router = new AuthRouter({
    authService: mockAuthService,
    authenticationMiddleware: mockAuthenticationMiddleware,
    rateLimiter,
  })

  const subrouter = express()
  const options = {
    resave: true,
    saveUninitialized: true,
    secret: "blah",
    cookie: {
      maxAge: 1209600000,
    },
  }
  subrouter.use(session(options))

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/github-redirect",
    attachReadRouteHandlerWrapper(router.authRedirect)
  )
  subrouter.get("/", attachReadRouteHandlerWrapper(router.githubAuth))
  subrouter.post("/login", attachReadRouteHandlerWrapper(router.login))
  subrouter.post("/verify", attachReadRouteHandlerWrapper(router.verify))
  subrouter.delete("/logout", attachReadRouteHandlerWrapper(router.logout))
  subrouter.get("/whoami", attachReadRouteHandlerWrapper(router.whoami))
  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("authRedirect", () => {
    const redirectUrl = "redirectUrl"
    it("redirects to the specified github url", async () => {
      mockAuthService.getAuthRedirectDetails.mockResolvedValueOnce({
        redirectUrl,
        cookieToken,
      })

      const resp = await request(app).get(`/github-redirect`)

      expect(mockAuthService.getAuthRedirectDetails).toHaveBeenCalledTimes(1)
      expect(resp.status).toEqual(302)
      expect(resp.headers.location).toContain(redirectUrl)
      expect(resp.headers["set-cookie"]).toEqual(
        expect.arrayContaining([expect.stringContaining(CSRF_COOKIE_NAME)])
      )
    })
  })

  describe("githubAuth", () => {
    const code = "code"
    const state = "state"
    const token = "token"
    it("retrieves the token and redirects back to the correct page after github auth", async () => {
      mockAuthService.getUserInfoFromGithubAuth.mockResolvedValueOnce({
        token,
      })

      const resp = await request(app)
        .get(`/?code=${code}&state=${state}`)
        .set("Cookie", `${CSRF_COOKIE_NAME}=${csrfState};`)

      expect(mockAuthService.getUserInfoFromGithubAuth).toHaveBeenCalledWith({
        csrfState,
        code,
        state,
      })
      expect(resp.status).toEqual(302)
      expect(resp.headers.location).toContain(`${FRONTEND_URL}/sites`)
      expect(resp.headers["set-cookie"]).toBeTruthy()
    })
  })
  describe("login", () => {
    it("calls the service to send otp", async () => {
      await request(app).post(`/login`).send({ email: mockEmail }).expect(200)
      expect(mockAuthService.sendOtp).toHaveBeenCalledWith(
        mockEmail.toLowerCase()
      )
    })
  })
  describe("verify", () => {
    const mockOtp = "123456"
    mockAuthService.verifyOtp.mockImplementationOnce(() =>
      okAsync({
        email: mockEmail,
      })
    )
    it("adds the cookie on login", async () => {
      mockAuthService.getAuthRedirectDetails.mockResolvedValueOnce(cookieToken)
      await request(app)
        .post(`/verify`)
        .send({ email: mockEmail, otp: mockOtp })
        .set("Cookie", `${COOKIE_NAME}=${cookieToken}`)
        .expect(200)
    })
  })
  describe("logout", () => {
    it("removes cookies on logout", async () => {
      const resp = await request(app)
        .delete(`/logout`)
        .set(
          "Cookie",
          `${CSRF_COOKIE_NAME}=${csrfState};${COOKIE_NAME}=${cookieToken}`
        )
        .expect(200)

      expect(resp.headers["set-cookie"]).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`${CSRF_COOKIE_NAME}=;`),
          expect.stringContaining(`${COOKIE_NAME}=;`),
        ])
      )
    })
  })

  describe("whoami", () => {
    it("returns user info if found", async () => {
      const expectedResponse = {
        userId: MOCK_USER_ID,
      }
      mockAuthService.getUserInfo.mockResolvedValueOnce(expectedResponse)

      const resp = await request(app).get(`/whoami`).expect(200)

      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockAuthService.getUserInfo).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })

    it("sends a 401 if user not found", async () => {
      mockAuthService.getUserInfo.mockResolvedValueOnce(undefined)

      await request(app).get(`/whoami`).expect(401)

      expect(mockAuthService.getUserInfo).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })
  })
})
