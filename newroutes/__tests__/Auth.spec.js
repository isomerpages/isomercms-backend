const cookieParser = require("cookie-parser")
const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { CSRF_COOKIE_NAME, COOKIE_NAME, AuthRouter } = require("../auth")

const { FRONTEND_URL } = process.env
const csrfState = "csrfState"
const cookieToken = "cookieToken"
const accessToken = undefined

describe("Unlinked Pages Router", () => {
  const mockAuthService = {
    getAuthRedirectDetails: jest.fn(),
    getGithubAuthToken: jest.fn(),
    getUserId: jest.fn(),
  }

  const router = new AuthRouter({
    authService: mockAuthService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/github-redirect",
    attachReadRouteHandlerWrapper(router.authRedirect)
  )
  app.get("/", attachReadRouteHandlerWrapper(router.githubAuth))
  app.delete("/logout", attachReadRouteHandlerWrapper(router.logout))
  app.get("/whoami", attachReadRouteHandlerWrapper(router.whoami))
  app.use(errorHandler)

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
      mockAuthService.getGithubAuthToken.mockResolvedValueOnce({
        token,
      })

      const resp = await request(app)
        .get(`/?code=${code}&state=${state}`)
        .set("Cookie", `${CSRF_COOKIE_NAME}=${csrfState};`)

      expect(mockAuthService.getGithubAuthToken).toHaveBeenCalledWith({
        csrfState,
        code,
        state,
      })
      expect(resp.status).toEqual(302)
      expect(resp.headers.location).toContain(`${FRONTEND_URL}/sites`)
      expect(resp.headers["set-cookie"]).toEqual(
        expect.arrayContaining([expect.stringContaining(COOKIE_NAME)])
      )
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
    const userId = "userId"
    it("redirects to the specified github url", async () => {
      mockAuthService.getUserId.mockResolvedValueOnce({
        userId,
      })

      await request(app).get(`/whoami`).expect(200)

      expect(mockAuthService.getUserId).toHaveBeenCalledWith({ accessToken })
    })
  })
})
