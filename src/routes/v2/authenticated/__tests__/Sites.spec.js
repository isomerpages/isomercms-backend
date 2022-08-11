const express = require("express")
const request = require("supertest")

const { NotFoundError } = require("@errors/NotFoundError")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { mockUserSessionData } = require("@fixtures/sessionData")

const { SitesRouter } = require("../sites")

// Can't set request fields - will always be undefined
const siteName = "siteName"

describe("Sites Router", () => {
  const mockSitesService = {
    getSites: jest.fn(),
    checkHasAccess: jest.fn(),
    getLastUpdated: jest.fn(),
    getStagingUrl: jest.fn(),
  }

  const router = new SitesRouter({
    sitesService: mockSitesService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get("/", attachReadRouteHandlerWrapper(router.getSites))
  subrouter.get(
    "/:siteName",
    attachReadRouteHandlerWrapper(router.checkHasAccess)
  )
  subrouter.get(
    "/:siteName/lastUpdated",
    attachReadRouteHandlerWrapper(router.getLastUpdated)
  )
  subrouter.get(
    "/:siteName/stagingUrl",
    attachReadRouteHandlerWrapper(router.getStagingUrl)
  )
  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getSites", () => {
    it("returns the list of sites accessible to the user", async () => {
      const sitesResp = ["site1", "site2"]
      mockSitesService.getSites.mockResolvedValueOnce(sitesResp)

      const resp = await request(app).get(`/`).expect(200)

      expect(resp.body).toStrictEqual({ siteNames: sitesResp })
      expect(mockSitesService.getSites).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })
  })

  describe("checkHasAccess", () => {
    it("rejects if user has no access to a site", async () => {
      mockSitesService.checkHasAccess.mockRejectedValueOnce(
        new NotFoundError("")
      )

      await request(app).get(`/${siteName}`).expect(404)

      expect(mockSitesService.checkHasAccess).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })

    it("allows if user has access to a site", async () => {
      await request(app).get(`/${siteName}`).expect(200)

      expect(mockSitesService.checkHasAccess).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })
  })

  describe("getLastUpdated", () => {
    it("returns the last updated time", async () => {
      const lastUpdated = "last-updated"
      mockSitesService.getLastUpdated.mockResolvedValueOnce(lastUpdated)

      const resp = await request(app)
        .get(`/${siteName}/lastUpdated`)
        .expect(200)

      expect(resp.body).toStrictEqual({ lastUpdated })
      expect(mockSitesService.getLastUpdated).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })
  })

  describe("getStagingUrl", () => {
    it("returns the last updated time", async () => {
      const stagingUrl = "staging-url"
      mockSitesService.getStagingUrl.mockResolvedValueOnce(stagingUrl)

      const resp = await request(app).get(`/${siteName}/stagingUrl`).expect(200)

      expect(resp.body).toStrictEqual({ stagingUrl })
      expect(mockSitesService.getStagingUrl).toHaveBeenCalledWith(
        mockUserSessionData
      )
    })
  })
})
