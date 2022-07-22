const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { mockSessionData } = require("@fixtures/sessionData")

const { NetlifyTomlRouter } = require("../netlifyToml")

describe("NetlifyToml Router", () => {
  const mockNetlifyTomlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new NetlifyTomlRouter({
    netlifyTomlService: mockNetlifyTomlService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/netlifyToml",
    attachReadRouteHandlerWrapper(router.readNetlifyToml)
  )
  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readNetlifyToml", () => {
    const netlifyTomlHeaderValues = "netlifyTomlHeaderValues"
    mockNetlifyTomlService.read.mockResolvedValue(netlifyTomlHeaderValues)

    it("retrieves netlifyToml details", async () => {
      const resp = await request(app).get(`/netlifyToml`).expect(200)

      expect(resp.body).toStrictEqual({ netlifyTomlHeaderValues })
      expect(mockNetlifyTomlService.read).toHaveBeenCalledWith(mockSessionData)
    })
  })
})
