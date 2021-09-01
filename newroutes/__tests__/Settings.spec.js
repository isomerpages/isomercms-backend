const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const {
  configContent,
  configSha,
  configResponse,
} = require("../../fixtures/config")
const {
  footerContent,
  footerSha,
  footerResponse,
} = require("../../fixtures/footer")
const { homepageContent, homepageSha } = require("../../fixtures/homepage")
const {
  navigationContent,
  navigationSha,
  navigationResponse,
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
  const accessToken = undefined // Can't set request fields - will always be undefined
  const reqDetails = { siteName, accessToken }

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
      const expectedResponse = {
        configSettings: configResponse,
        footerSettings: footerResponse,
        navigationSettings: navigationResponse,
      }
      const resp = await request(app).get(`/${siteName}/settings`).expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockConfigYmlService.read).toHaveBeenCalled()
      expect(mockFooterYmlService.read).toHaveBeenCalled()
      expect(mockNavYmlService.read).toHaveBeenCalled()
    })
  })

  describe("updateSettingsPage", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)
    mockHomepagePageService.read.mockResolvedValue(homepage)

    const updatedFbPixelValue = `${configContent["facebook-pixel"]}test`
    const updatedTitleValue = `${configContent.title}test`
    const updatedFaq = `${footerContent.faq}test`
    const updatedLogo = `${navigationContent.logo}test`

    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/settings`).send({}).expect(400)
    })

    it("updates only config data if non-title config field is updated", async () => {
      const requestObject = {
        configSettings: { "facebook-pixel": updatedFbPixelValue },
        footerSettings: {},
        navigationSettings: {},
      }
      const expectedConfigServiceInput = {
        fileContent: {
          ...configContent,
          "facebook-pixel": updatedFbPixelValue,
        },
        sha: configSha,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockConfigYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).not.toHaveBeenCalled()
    })

    it("updates both homepage and config data when only title field is updated", async () => {
      const requestObject = {
        configSettings: { title: updatedTitleValue },
        footerSettings: {},
        navigationSettings: {},
      }
      const expectedConfigServiceInput = {
        fileContent: {
          ...configContent,
          title: updatedTitleValue,
        },
        sha: configSha,
      }
      const expectedHomepageServiceInput = {
        content: homepageContent.pageBody,
        frontMatter: {
          ...homepageContent.frontMatter,
          title: updatedTitleValue,
        },
        sha: homepage.sha,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockConfigYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedHomepageServiceInput
      )
    })

    it("updates only footer data when only footer fields are updated", async () => {
      const requestObject = {
        configSettings: {},
        footerSettings: { faq: updatedFaq },
        navigationSettings: {},
      }
      const expectedFooterServiceInput = {
        fileContent: {
          ...footerContent,
          faq: updatedFaq,
        },
        sha: footerSha,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockConfigYmlService.update).not.toHaveBeenCalled()
      expect(mockFooterYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedFooterServiceInput
      )
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).not.toHaveBeenCalled()
    })

    it("updates only navigation data when only navigation fields are updated", async () => {
      const requestObject = {
        configSettings: {},
        footerSettings: {},
        navigationSettings: { logo: updatedLogo },
      }
      const expectedNavigationServiceInput = {
        fileContent: {
          ...navigationContent,
          logo: updatedLogo,
        },
        sha: navigationSha,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockConfigYmlService.update).not.toHaveBeenCalled()
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedNavigationServiceInput
      )
      expect(mockHomepagePageService.update).not.toHaveBeenCalled()
    })

    it("updates config, homepage, navigation, and footer data when all fields are updated", async () => {
      const requestObject = {
        configSettings: {
          "facebook-pixel": updatedFbPixelValue,
          title: updatedTitleValue,
        },
        footerSettings: { faq: updatedFaq },
        navigationSettings: { logo: updatedLogo },
      }
      const expectedConfigServiceInput = {
        fileContent: {
          ...configContent,
          "facebook-pixel": updatedFbPixelValue,
          title: updatedTitleValue,
        },
        sha: configSha,
      }
      const expectedFooterServiceInput = {
        fileContent: {
          ...footerContent,
          faq: updatedFaq,
        },
        sha: footerSha,
      }
      const expectedNavigationServiceInput = {
        fileContent: {
          ...navigationContent,
          logo: updatedLogo,
        },
        sha: navigationSha,
      }
      const expectedHomepageServiceInput = {
        content: homepageContent.pageBody,
        frontMatter: {
          ...homepageContent.frontMatter,
          title: updatedTitleValue,
        },
        sha: homepage.sha,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockConfigYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedFooterServiceInput
      )
      expect(mockNavYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedNavigationServiceInput
      )
      expect(mockHomepagePageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedHomepageServiceInput
      )
    })
  })
})
