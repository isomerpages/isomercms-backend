const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { NetlifyTomlRouter } = require("../netlifyToml")

describe("NetlifyToml Router", () => {
  const mockNetlifyTomlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new NetlifyTomlRouter({
    netlifyTomlService: mockNetlifyTomlService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/netlifyToml",
    attachReadRouteHandlerWrapper(router.readNetlifyToml)
  )
  app.use(errorHandler)

  const siteName = "test-site"
  const accessToken = undefined // Can't set request fields - will always be undefined

  const reqDetails = { accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readNetlifyToml", () => {
    const netlifyTomlHeaderValues = "netlifyTomlHeaderValues"
    mockNetlifyTomlService.read.mockResolvedValue(netlifyTomlHeaderValues)
    it("retrieves netlifyToml details", async () => {
      const resp = await request(app)
        .get(`/${siteName}/netlifyToml`)
        .expect(200)

      expect(resp.body).toStrictEqual({ netlifyTomlHeaderValues })
      expect(mockNetlifyTomlService.read).toHaveBeenCalledWith(reqDetails)
    })
  })
})
