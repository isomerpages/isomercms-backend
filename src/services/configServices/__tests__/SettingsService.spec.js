const MOCK_PASSWORD = "password"

jest.mock("../../../utils/crypto-utils", () => ({
  __esModule: true,
  decryptPassword: jest.fn().mockReturnValue("password"),
}))

const { okAsync, errAsync } = require("neverthrow")

const { configContent, configSha } = require("@fixtures/config")
const { footerContent, footerSha } = require("@fixtures/footer")
const { homepageContent, homepageSha } = require("@fixtures/homepage")
const { navigationContent, navigationSha } = require("@fixtures/navigation")
const { mockUserWithSiteSessionData } = require("@fixtures/sessionData")
const {
  MOCK_SITE_DBENTRY_ONE,
  MOCK_SITE_DBENTRY_TWO,
  MOCK_DEPLOYMENT_DBENTRY_TWO,
} = require("@fixtures/sites")
const { NotFoundError } = require("@root/errors/NotFoundError")

const { SettingsService } = require("../SettingsService")

describe("Settings Service", () => {
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

  const mockSitesService = {
    getBySiteName: jest.fn(),
    update: jest.fn(),
  }

  const mockDeploymentsService = {
    getDeploymentInfoFromSiteId: jest.fn(),
    updateAmplifyPassword: jest.fn(),
  }

  const mockGitHubService = {
    changeRepoPrivacy: jest.fn(),
  }

  const service = new SettingsService({
    configYmlService: mockConfigYmlService,
    homepagePageService: mockHomepagePageService,
    footerYmlService: mockFooterYmlService,
    navYmlService: mockNavYmlService,
    sitesService: mockSitesService,
    deploymentsService: mockDeploymentsService,
    gitHubService: mockGitHubService,
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
        service.retrieveSettingsFiles(mockUserWithSiteSessionData)
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
        service.retrieveSettingsFiles(mockUserWithSiteSessionData, true)
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

  describe("getPassword", () => {
    it("retrieves password data successfully for private amplify repos", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_TWO)
      )
      mockDeploymentsService.getDeploymentInfoFromSiteId.mockResolvedValue(
        okAsync(MOCK_DEPLOYMENT_DBENTRY_TWO)
      )

      // Act
      const resp = await service.getPassword(mockUserWithSiteSessionData)

      // Assert
      expect(resp.value).toMatchObject({
        password: MOCK_PASSWORD,
        isAmplifySite: true,
      })
    })

    it("returns appropriate response for non-private amplify repos", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_ONE)
      )

      // Act
      const resp = await service.getPassword(mockUserWithSiteSessionData)

      // Assert
      expect(resp.value).toMatchObject({
        password: "",
        isAmplifySite: true,
      })
    })

    it("returns appropriate response for netlify repos", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockResolvedValue(
        errAsync(new NotFoundError())
      )

      // Act
      const resp = await service.getPassword(mockUserWithSiteSessionData)

      // Assert
      expect(resp.value).toMatchObject({
        isAmplifySite: false,
      })
    })
  })

  describe("Update settings files", () => {
    mockConfigYmlService.read.mockResolvedValue(config)
    mockFooterYmlService.read.mockResolvedValue(footer)
    mockNavYmlService.read.mockResolvedValue(navigation)
    mockHomepagePageService.read.mockResolvedValue(homepage)

    const updatedFbPixelValue = `123456789012340`
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      ).resolves.not.toThrow()

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      ).resolves.not.toThrow()

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      ).resolves.not.toThrow()

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).not.toHaveBeenCalled()
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
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
        mockUserWithSiteSessionData,
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      ).resolves.not.toThrow()

      expect(mockConfigYmlService.update).not.toHaveBeenCalled()
      expect(mockFooterYmlService.update).not.toHaveBeenCalled()
      expect(mockNavYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
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
        service.updateSettingsFiles(mockUserWithSiteSessionData, {
          config,
          homepage,
          footer,
          navigation,
          updatedConfigContent: updatedContent.configSettings,
          updatedFooterContent: updatedContent.footerSettings,
          updatedNavigationContent: updatedContent.navigationSettings,
        })
      ).resolves.not.toThrow()

      expect(mockConfigYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedConfigServiceInput
      )
      expect(mockFooterYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedFooterServiceInput
      )
      expect(mockNavYmlService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedNavigationServiceInput
      )
      expect(mockHomepagePageService.update).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        expectedHomepageServiceInput
      )
    })
  })

  describe("updatePassword", () => {
    const password = "newPass"

    it("updates password for private amplify repos", async () => {
      // Arrange
      const enablePassword = true
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_TWO)
      )
      mockDeploymentsService.updateAmplifyPassword.mockResolvedValue(
        okAsync("")
      )

      // Act
      await service.updatePassword(mockUserWithSiteSessionData, {
        password,
        enablePassword,
      })

      // Assert
      expect(mockGitHubService.changeRepoPrivacy).not.toHaveBeenCalled()
      expect(mockSitesService.update).not.toHaveBeenCalled()
      expect(
        mockDeploymentsService.updateAmplifyPassword
      ).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData.siteName,
        password,
        enablePassword
      )
    })

    it("does nothing if removing password for public amplify repos", async () => {
      // Arrange
      const enablePassword = false
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_ONE)
      )

      // Act
      await service.updatePassword(mockUserWithSiteSessionData, {
        password: "",
        enablePassword,
      })

      // Assert
      expect(mockGitHubService.changeRepoPrivacy).not.toHaveBeenCalled()
      expect(mockSitesService.update).not.toHaveBeenCalled()
      expect(
        mockDeploymentsService.updateAmplifyPassword
      ).not.toHaveBeenCalled()
    })

    it("updates password for previously public amplify repos", async () => {
      // Arrange
      const enablePassword = true
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_ONE)
      )
      mockGitHubService.changeRepoPrivacy.mockResolvedValueOnce(okAsync(""))
      mockSitesService.update.mockResolvedValue("")
      mockDeploymentsService.updateAmplifyPassword.mockResolvedValue(
        okAsync("")
      )

      // Act
      await service.updatePassword(mockUserWithSiteSessionData, {
        password,
        enablePassword,
      })

      // Assert
      expect(mockGitHubService.changeRepoPrivacy).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        enablePassword
      )
      expect(mockSitesService.update).toHaveBeenLastCalledWith({
        id: MOCK_SITE_DBENTRY_ONE.id,
        isPrivate: enablePassword,
      })
      expect(
        mockDeploymentsService.updateAmplifyPassword
      ).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData.siteName,
        password,
        enablePassword
      )
    })

    it("removes password for previously private amplify repos", async () => {
      // Arrange
      const enablePassword = false
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync(MOCK_SITE_DBENTRY_TWO)
      )
      mockGitHubService.changeRepoPrivacy.mockResolvedValueOnce(okAsync(""))
      mockSitesService.update.mockResolvedValue("")
      mockDeploymentsService.updateAmplifyPassword.mockResolvedValue(
        okAsync("")
      )

      // Act
      await service.updatePassword(mockUserWithSiteSessionData, {
        password: "",
        enablePassword,
      })

      // Assert
      expect(mockGitHubService.changeRepoPrivacy).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData,
        enablePassword
      )
      expect(mockSitesService.update).toHaveBeenLastCalledWith({
        id: MOCK_SITE_DBENTRY_TWO.id,
        isPrivate: enablePassword,
      })
      expect(
        mockDeploymentsService.updateAmplifyPassword
      ).toHaveBeenLastCalledWith(
        mockUserWithSiteSessionData.siteName,
        "",
        enablePassword
      )
    })

    it("fails if attempting to change password on a netlify repo", async () => {
      // Arrange
      const thrownErr = new NotFoundError()
      mockSitesService.getBySiteName.mockResolvedValue(errAsync(thrownErr))

      // Act
      const resp = await service.updatePassword(mockUserWithSiteSessionData, {
        password,
        enablePassword: true,
      })

      // Assert
      expect(resp.error).toBe(thrownErr)
      expect(mockGitHubService.changeRepoPrivacy).not.toHaveBeenCalled()
      expect(mockSitesService.update).not.toHaveBeenCalled()
      expect(
        mockDeploymentsService.updateAmplifyPassword
      ).not.toHaveBeenCalled()
    })
  })
})
