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
const {
  SettingsService,
} = require("../../services/configServices/SettingsService")
const { SettingsRouter } = require("../settings.js")

describe("Settings Router", () => {
  const mockSettingsService = {
    retrieveSettingsFiles: jest.fn(),
    updateSettingsFiles: jest.fn(),
    shouldUpdateHomepage: jest.fn(),
    mergeUpdatedData: jest.fn(),
    extractConfigFields: SettingsService.extractConfigFields,
    extractFooterFields: SettingsService.extractFooterFields,
    extractNavFields: SettingsService.extractNavFields,
  }

  const router = new SettingsRouter({
    settingsService: mockSettingsService,
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
    mockSettingsService.retrieveSettingsFiles.mockResolvedValue({
      config,
      footer,
      navigation,
    })

    it("retrieves settings data", async () => {
      const expectedResponse = {
        configSettings: configResponse,
        footerSettings: footerResponse,
        navigationSettings: navigationResponse,
      }
      const resp = await request(app).get(`/${siteName}/settings`).expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockSettingsService.retrieveSettingsFiles).toHaveBeenCalled()
    })
  })

  describe("updateSettingsPage", () => {
    mockSettingsService.retrieveSettingsFiles.mockResolvedValue({
      config,
      footer,
      navigation,
      homepage,
    })

    const updatedFbPixelValue = `${configContent["facebook-pixel"]}test`
    const updatedTitleValue = `${configContent.title}test`
    const updatedFaq = `${footerContent.faq}test`
    const updatedLogo = `${navigationContent.logo}test`

    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/settings`).send({}).expect(400)
    })

    it("successfully updates settings", async () => {
      const requestObject = {
        configSettings: {
          title: updatedTitleValue,
          "facebook-pixel": updatedFbPixelValue,
        },
        footerSettings: { faq: updatedFaq },
        navigationSettings: { logo: updatedLogo },
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockSettingsService.retrieveSettingsFiles).toHaveBeenCalled()
      expect(mockSettingsService.updateSettingsFiles).toHaveBeenCalled()
    })
  })
})
