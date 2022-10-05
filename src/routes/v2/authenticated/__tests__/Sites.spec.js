const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const {
  mockSiteName,
  mockUserSessionData,
  mockUserWithSiteSessionData,
} = require("@fixtures/sessionData")

const { SitesRouter } = require("../sites")

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

  describe("getLastUpdated", () => {
    it("returns the last updated time", async () => {
      const lastUpdated = "last-updated"
      mockSitesService.getLastUpdated.mockResolvedValueOnce(lastUpdated)

      const resp = await request(app)
        .get(`/${mockSiteName}/lastUpdated`)
        .expect(200)

      expect(resp.body).toStrictEqual({ lastUpdated })
      expect(mockSitesService.getLastUpdated).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName
      )
    })
  })

  describe("getStagingUrl", () => {
    it("returns the last updated time", async () => {
      const stagingUrl = "staging-url"
      mockSitesService.getStagingUrl.mockResolvedValueOnce(stagingUrl)

      const resp = await request(app)
        .get(`/${mockSiteName}/stagingUrl`)
        .expect(200)

      expect(resp.body).toStrictEqual({ stagingUrl })
      expect(mockSitesService.getStagingUrl).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName
      )
    })
  })
})
