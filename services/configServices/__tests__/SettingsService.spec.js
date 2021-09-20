const { configContent, configSha } = require("../../../fixtures/config")
const { footerContent, footerSha } = require("../../../fixtures/footer")
const { homepageContent, homepageSha } = require("../../../fixtures/homepage")
const {
  navigationContent,
  navigationSha,
} = require("../../../fixtures/navigation")
const { SettingsService } = require("../SettingsService")

describe("Settings Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
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

  const service = new SettingsService({
    configYmlService: mockConfigYmlService,
    homepagePageService: mockHomepagePageService,
    footerYmlService: mockFooterYmlService,
    navYmlService: mockNavYmlService,
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("Retrieve settings files", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)
    mockHomepagePageService.read.mockResolvedValue(homepage)

    it("retrieves settings data without homepage", async () => {
      await expect(
        service.retrieveSettingsFiles(reqDetails)
      ).resolves.toMatchObject({
        config,
        footer,
        navigation,
        homepage: undefined,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalled()
      expect(mockFooterYmlService.read).toHaveBeenCalled()
      expect(mockNavYmlService.read).toHaveBeenCalled()
    })

    it("retrieves settings data with homepage", async () => {
      await expect(
        service.retrieveSettingsFiles(reqDetails, true)
      ).resolves.toMatchObject({
        config,
        footer,
        navigation,
        homepage,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalled()
      expect(mockFooterYmlService.read).toHaveBeenCalled()
      expect(mockNavYmlService.read).toHaveBeenCalled()
      expect(mockHomepagePageService.read).toHaveBeenCalled()
    })
  })

  describe("Update settings files", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)
    mockHomepagePageService.read.mockResolvedValue(homepage)

    const updatedFbPixelValue = `${configContent["facebook-pixel"]}test`
    const updatedTitleValue = `${configContent.title}test`
    const updatedDescriptionValue = `${configContent.description}test`
    const updatedFaq = `${footerContent.faq}test`
    const updatedLogo = `${navigationContent.logo}test`

    it("updates only config data if non-title, non-description config field is updated", async () => {
      const updatedContent = {
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

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).not.toHaveBeenCalled()
    })

    it("updates both homepage and config data when only title field is updated", async () => {
      const updatedContent = {
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

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedHomepageServiceInput
      )
    })

    it("updates both homepage and config data when only description field is updated", async () => {
      const updatedContent = {
        configSettings: { description: updatedDescriptionValue },
        footerSettings: {},
        navigationSettings: {},
      }
      const expectedConfigServiceInput = {
        fileContent: {
          ...configContent,
          description: updatedDescriptionValue,
        },
        sha: configSha,
      }
      const expectedHomepageServiceInput = {
        content: homepageContent.pageBody,
        frontMatter: {
          ...homepageContent.frontMatter,
          description: updatedDescriptionValue,
        },
        sha: homepage.sha,
      }

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedHomepageServiceInput
      )
    })

    it("updates only footer data when only footer fields are updated", async () => {
      const updatedContent = {
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

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).toHaveBeenCalledTimes(0)
      expect(mockFooterYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedFooterServiceInput
      )
      expect(mockNavYmlService.update).toHaveBeenCalledTimes(0)
      expect(mockHomepagePageService.update).toHaveBeenCalledTimes(0)
    })

    it("updates only navigation data when only navigation fields are updated", async () => {
      const updatedContent = {
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

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).not.toHaveBeenCalled()
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedNavigationServiceInput
      )
      expect(mockHomepagePageService.update).not.toHaveBeenCalled()
    })

    it("updates config, homepage, navigation, and footer data when all fields are updated", async () => {
      const updatedContent = {
        configSettings: {
          description: updatedDescriptionValue,
          title: updatedTitleValue,
          "facebook-pixel": updatedFbPixelValue,
        },
        footerSettings: { faq: updatedFaq },
        navigationSettings: { logo: updatedLogo },
      }
      const expectedConfigServiceInput = {
        fileContent: {
          ...configContent,
          title: updatedTitleValue,
          description: updatedDescriptionValue,
          "facebook-pixel": updatedFbPixelValue,
        },
        sha: configSha,
      }
      const expectedHomepageServiceInput = {
        content: homepageContent.pageBody,
        frontMatter: {
          ...homepageContent.frontMatter,
          title: updatedTitleValue,
          description: updatedDescriptionValue,
        },
        sha: homepage.sha,
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

      await expect(
        service.updateSettingsFiles({
          reqDetails,
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      )

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedFooterServiceInput
      )
      expect(mockNavYmlService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedNavigationServiceInput
      )
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        reqDetails,
        expectedHomepageServiceInput
      )
    })
  })
})
