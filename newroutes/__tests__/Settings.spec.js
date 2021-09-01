const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { configContent, configSha } = require("../../fixtures/config")
const { footerContent, footerSha } = require("../../fixtures/footer")
const { homepageContent, homepageSha } = require("../../fixtures/homepage")
const {
  navigationContent,
  navigationSha,
} = require("../../fixtures/navigation")
const { SettingsRouter } = require("../settings.js")

describe("Settings Router", () => {
  const mockConfigYmlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const mockFooterYmlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const mockNavYmlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const mockHomepagePageService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new SettingsRouter({
    homepagePageService: mockHomepagePageService,
    configYmlService: mockConfigYmlService,
    footerYmlService: mockFooterYmlService,
    navYmlService: mockNavYmlService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.get(
    "/:siteName/settings",
    attachReadRouteHandlerWrapper(router.readSettingsPage)
  )
  app.post(
    "/:siteName/settings",
    attachReadRouteHandlerWrapper(router.updateSettingsPage)
  )
  app.use(errorHandler)

  const siteName = "test-site"

  const config = {
    content: configContent,
    sha: configSha,
  }
  const footer = {
    content: footerContent,
    sha: footerSha,
  }
  const navigation = {
    content: navigationContent,
    sha: navigationSha,
  }
  const homepage = {
    content: homepageContent,
    sha: homepageSha,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readSettingsPage", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)

    it("retrieves settings data", async () => {
      const resp = await request(app).get(`/${siteName}/settings`).expect(200)
    })
  })

  describe("updateSettingsPage", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)
    mockHomepagePageService.read.mockResolvedValue(homepage)

    // come up with merged data - for e.g. expect the navYmlService to not be called at all
    // if no  changes to nav
    it("updates only config data if non-title config field is updated", async () => {
      const resp = await request(app)
        .post(`/${siteName}/settings`)
        .send()
        .expect(200)
    })

    it("updates both homepage and config data when only title field is updated", async () => {
      const resp = await request(app)
        .post(`/${siteName}/settings`)
        .send()
        .expect(200)
    })

    it("updates only footer data when only footer fields are updated", async () => {
      const resp = await request(app)
        .post(`/${siteName}/settings`)
        .send()
        .expect(200)
    })

    it("updates only navigation data when only navigation fields are updated", async () => {
      const resp = await request(app)
        .post(`/${siteName}/settings`)
        .send()
        .expect(200)
    })

    it("updates config, homepage, navigation, and footer data when all fields are updated", async () => {
      const resp = await request(app)
        .post(`/${siteName}/settings`)
        .send()
        .expect(200)
    })
  })
})
