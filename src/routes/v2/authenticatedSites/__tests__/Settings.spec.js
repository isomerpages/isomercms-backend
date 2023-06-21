const express = require("express")
const { okAsync, errAsync } = require("neverthrow")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { configContent, configSha, configResponse } = require("@fixtures/config")
const { footerContent, footerSha, footerResponse } = require("@fixtures/footer")
const { homepageContent, homepageSha } = require("@fixtures/homepage")
const {
  navigationContent,
  navigationSha,
  navigationResponse,
} = require("@fixtures/navigation")
const { NotFoundError } = require("@root/errors/NotFoundError")
const { mockUserWithSiteSessionData } = require("@root/fixtures/sessionData")
const { SettingsService } = require("@services/configServices/SettingsService")

const { SettingsRouter } = require("../settings")

describe("Settings Router", () => {
  const mockSettingsService = {
    retrieveSettingsFiles: jest.fn(),
    updateSettingsFiles: jest.fn(),
    shouldUpdateHomepage: jest.fn(),
    mergeUpdatedData: jest.fn(),
    getEncryptedPassword: jest.fn(),
    updatePassword: jest.fn(),
    extractConfigFields: SettingsService.extractConfigFields,
    extractFooterFields: SettingsService.extractFooterFields,
    extractNavFields: SettingsService.extractNavFields,
  }

  const router = new SettingsRouter({
    settingsService: mockSettingsService,
  })

  const subrouter = express()
  subrouter.get(
    "/:siteName/settings",
    attachReadRouteHandlerWrapper(router.readSettingsPage)
  )
  subrouter.post(
    "/:siteName/settings",
    attachReadRouteHandlerWrapper(router.updateSettingsPage)
  )
  subrouter.get(
    "/:siteName/settings/repoPassword",
    attachReadRouteHandlerWrapper(router.getRepoPassword)
  )
  subrouter.post(
    "/:siteName/settings/repoPassword",
    attachReadRouteHandlerWrapper(router.updateRepoPassword)
  )
  const app = generateRouter(subrouter)

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

  const ENCRYPTED_PASSWORD = "encrypted"
  const ENCRYPTION_IV = "iv"
  const IS_AMPLIFY_SITE = true

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
        ...configResponse,
        ...footerResponse,
        ...navigationResponse,
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

    const updatedFbPixelValue = `123456789012340`
    const updatedTitleValue = `${configContent.title}test`
    const updatedFaq = `${footerContent.faq}test`
    const updatedLogo = `${navigationContent.logo}test`

    it("successfully updates settings", async () => {
      const requestObject = {
        title: updatedTitleValue,
        "facebook-pixel": updatedFbPixelValue,
        faq: updatedFaq,
        logo: updatedLogo,
      }

      await request(app)
        .post(`/${siteName}/settings`)
        .send(requestObject)
        .expect(200)

      expect(mockSettingsService.retrieveSettingsFiles).toHaveBeenCalled()
      expect(mockSettingsService.updateSettingsFiles).toHaveBeenCalled()
    })
    it("should allow for facebook pixel values of length 16", async () => {
      // Arrange
      // NOTE: Old fb pixel values are 16 characters long
      const params = {
        "facebook-pixel": `${updatedFbPixelValue}0`,
      }

      // Act
      await request(app).post(`/${siteName}/settings`).send(params).expect(200)

      // Assert
      expect(mockSettingsService.retrieveSettingsFiles).toHaveBeenCalled()
      expect(mockSettingsService.updateSettingsFiles).toHaveBeenCalled()
    })
  })

  describe("getRepoPassword", () => {
    it("successfully retrieves repo password", async () => {
      // Arrange
      const expectedResponse = {
        encryptedPassword: ENCRYPTED_PASSWORD,
        iv: ENCRYPTION_IV,
        isAmplifySite: IS_AMPLIFY_SITE,
      }
      mockSettingsService.getEncryptedPassword.mockResolvedValueOnce(
        okAsync(expectedResponse)
      )

      // Act
      const resp = await request(app)
        .get(`/${siteName}/settings/repoPassword`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockSettingsService.getEncryptedPassword).toHaveBeenCalled()
    })
    it("throws error if getEncryptedPassword returns error", async () => {
      // Arrange
      const thrownErr = new NotFoundError()
      mockSettingsService.getEncryptedPassword.mockResolvedValueOnce(
        errAsync(thrownErr)
      )

      // Act
      const resp = await request(app)
        .get(`/${siteName}/settings/repoPassword`)
        .expect(404)

      // Assert
      expect(mockSettingsService.getEncryptedPassword).toHaveBeenCalled()
    })
  })

  describe("updateRepoPassword", () => {
    const requestObject = {
      encryptedPassword: ENCRYPTED_PASSWORD,
      iv: ENCRYPTION_IV,
      enablePassword: true,
    }
    it("successfully updates repo password", async () => {
      // Arrange
      mockSettingsService.updatePassword.mockResolvedValueOnce(okAsync(""))

      // Act
      const resp = await request(app)
        .post(`/${siteName}/settings/repoPassword`)
        .send(requestObject)
        .expect(200)

      // Assert
      expect(mockSettingsService.updatePassword).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        requestObject
      )
    })
    it("throws error if getEncryptedPassword returns error", async () => {
      // Arrange
      const thrownErr = new NotFoundError()
      mockSettingsService.updatePassword.mockResolvedValueOnce(
        errAsync(thrownErr)
      )

      // Act
      const resp = await request(app)
        .post(`/${siteName}/settings/repoPassword`)
        .send(requestObject)
        .expect(404)

      // Assert
      expect(mockSettingsService.updatePassword).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        requestObject
      )
    })

    it("throws error if request object is incorrect", async () => {
      // Arrange
      const badRequestObject = {
        encryptedPassword: "",
      }

      // Act
      const resp = await request(app)
        .post(`/${siteName}/settings/repoPassword`)
        .send(badRequestObject)
        .expect(400)

      // Assert
      expect(mockSettingsService.updatePassword).not.toHaveBeenCalled()
    })
  })
})
