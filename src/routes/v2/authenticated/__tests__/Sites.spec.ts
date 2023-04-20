import express from "express"
import { ok } from "neverthrow"
import request from "supertest"

import type { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { generateRouter } from "@fixtures/app"
import {
  mockSiteName,
  mockUserSessionData,
  mockUserWithSiteSessionData,
} from "@fixtures/sessionData"
import { StatsMiddleware } from "@root/middleware/stats"
import type SitesService from "@services/identity/SitesService"

import { SitesRouter } from "../sites"

describe("Sites Router", () => {
  const mockSitesService = {
    getSites: jest.fn(),
    getLastUpdated: jest.fn(),
    getStagingUrl: jest.fn(),
    getSiteUrl: jest.fn(),
    getSiteInfo: jest.fn(),
  }

  const mockAuthorizationMiddleware = {
    verifySiteMember: jest.fn(),
  }

  const mockStatsMiddleware = {
    countGithubSites: jest.fn(),
    countMigratedSites: jest.fn(),
  }

  const router = new SitesRouter({
    sitesService: (mockSitesService as unknown) as SitesService,
    authorizationMiddleware: (mockAuthorizationMiddleware as unknown) as AuthorizationMiddleware,
    statsMiddleware: (mockStatsMiddleware as unknown) as StatsMiddleware,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get("/", attachReadRouteHandlerWrapper(router.getSites))
  subrouter.get(
    "/:siteName/lastUpdated",
    attachReadRouteHandlerWrapper(router.getLastUpdated)
  )
  subrouter.get(
    "/:siteName/stagingUrl",
    attachReadRouteHandlerWrapper(router.getStagingUrl)
  )
  subrouter.get(
    "/:siteName/siteUrl",
    attachReadRouteHandlerWrapper(router.getSiteUrl)
  )
  subrouter.get(
    "/:siteName/info",
    attachReadRouteHandlerWrapper(router.getSiteInfo)
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
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getStagingUrl", () => {
    it("returns the site's staging URL", async () => {
      const stagingUrl = "staging-url"
      mockSitesService.getStagingUrl.mockResolvedValueOnce(ok(stagingUrl))

      const resp = await request(app)
        .get(`/${mockSiteName}/stagingUrl`)
        .expect(200)

      expect(resp.body).toStrictEqual({ stagingUrl })
      expect(mockSitesService.getStagingUrl).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getSiteUrl", () => {
    it("returns the site's site URL", async () => {
      const siteUrl = "prod-url"
      mockSitesService.getSiteUrl.mockResolvedValueOnce(siteUrl)

      const resp = await request(app)
        .get(`/${mockSiteName}/siteUrl`)
        .expect(200)

      expect(resp.body).toStrictEqual({ siteUrl })
      expect(mockSitesService.getSiteUrl).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getSiteInfo", () => {
    it("returns the site's info", async () => {
      const siteInfo = {
        savedAt: 12345678,
        savedBy: "test@example.com",
        publishedAt: 23456789,
        publishedBy: "test2@example.com",
        stagingUrl: "staging-url",
        siteUrl: "prod-url",
      }
      mockSitesService.getSiteInfo.mockResolvedValueOnce(siteInfo)

      const resp = await request(app).get(`/${mockSiteName}/info`).expect(200)

      expect(resp.body).toStrictEqual(siteInfo)
      expect(mockSitesService.getSiteInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })
})
