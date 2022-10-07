import { ModelStatic } from "sequelize"

import { Deployment, Site } from "@database/models"
import {
  mockCommitMessageObject1,
  mockCommitMessageObject2,
  mockGitHubEmailAddress1,
  mockGitHubEmailAddress2,
  mockGitHubDate1,
  mockGitHubDate2,
  mockCommitMessage1,
  mockCommitMessage2,
} from "@fixtures/identity"
import {
  repoInfo,
  repoInfo2,
  adminRepo,
  noAccessRepo,
} from "@fixtures/repoInfo"
import {
  mockUserWithSiteSessionData,
  mockSessionDataEmailUser,
  mockIsomerUserId,
  mockEmail,
  mockSessionDataEmailUserWithSite,
} from "@fixtures/sessionData"
import { mockAxiosInstance, prepareAxiosMock } from "@mocks/axios"
import { NotFoundError } from "@root/errors/NotFoundError"
import { GitHubCommitData } from "@root/types/commitData"
import { ConfigYmlData } from "@root/types/configYml"
import type { RepositoryData } from "@root/types/repoInfo"
import { SiteInfo } from "@root/types/siteInfo"
import { GitHubService } from "@services/db/GitHubService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import _SitesService from "@services/identity/SitesService"
import TokenStore from "@services/identity/TokenStore"
import UsersService from "@services/identity/UsersService"

const MockRepository = {
  findOne: jest.fn(),
}

const MockGithubService = {
  checkHasAccess: jest.fn(),
  getLatestCommitOfBranch: jest.fn(),
  getRepoInfo: jest.fn(),
}

const MockConfigYmlService = {
  read: jest.fn(),
}

const MockUsersService = {
  findById: jest.fn(),
  findSitesByUserId: jest.fn(),
}

const MockIsomerAdminsService = {
  getByUserId: jest.fn(),
}

const MockTokenStore = {
  getToken: jest.fn(),
}

const SitesService = new _SitesService({
  siteRepository: (MockRepository as unknown) as ModelStatic<Site>,
  gitHubService: (MockGithubService as unknown) as GitHubService,
  configYmlService: (MockConfigYmlService as unknown) as ConfigYmlService,
  usersService: (MockUsersService as unknown) as UsersService,
  isomerAdminsService: (MockIsomerAdminsService as unknown) as IsomerAdminsService,
  tokenStore: (MockTokenStore as unknown) as TokenStore,
})

const mockSiteName = "some site name"
const mockSite = ({
  name: "i m a site",
  apiTokenName: "0000",
  users: [],
} as unknown) as Site

describe("SitesService", () => {
  beforeAll(() => {
    prepareAxiosMock()
  })

  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("getBySiteName", () => {
    it("should call the findOne method of the db model to get the siteName", async () => {
      // Arrange
      const expected = mockSite
      MockRepository.findOne.mockResolvedValueOnce(mockSite)

      // Act
      const actual = await SitesService.getBySiteName(mockSiteName)

      // Assert
      expect(actual).toBe(expected)
      expect(MockRepository.findOne).toBeCalledWith({
        where: {
          name: mockSiteName,
        },
      })
    })
  })

  describe("getCommitAuthorEmail", () => {
    it("should return the email of the commit author who is an email login user", async () => {
      // Arrange
      const expected = mockEmail
      const commit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress1,
          date: mockGitHubDate1,
        },
        message: JSON.stringify(mockCommitMessageObject1),
      }
      MockUsersService.findById.mockResolvedValueOnce(mockSessionDataEmailUser)

      // Act
      const actual = await SitesService.getCommitAuthorEmail(commit)

      // Assert
      expect(actual).toBe(expected)
      expect(MockUsersService.findById).toHaveBeenCalledWith(mockIsomerUserId)
    })

    it("should return the email of the commit author who is a GitHub login user", async () => {
      // Arrange
      const expected = mockGitHubEmailAddress1
      const commit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress1,
          date: mockGitHubDate1,
        },
        message: mockCommitMessage1,
      }

      // Act
      const actual = await SitesService.getCommitAuthorEmail(commit)

      // Assert
      expect(actual).toBe(expected)
      expect(MockUsersService.findById).not.toHaveBeenCalled()
    })
  })

  describe("getUrlsOfSite", () => {
    const deployment: Partial<Deployment> = {
      stagingUrl: "https://repo-deployment-staging.netlify.app",
      productionUrl: "https://repo-deployment-prod.netlify.app",
    }
    const configYmlData: Partial<ConfigYmlData> = {
      staging: "https://repo-configyml-staging.netlify.app",
      prod: "https://repo-configyml-prod.netlify.app",
    }
    const gitHubUrls = {
      staging: "https://repo-repoinfo-staging.netlify.app",
      prod: "https://repo-repoinfo-prod.netlify.app",
    }
    const repoInfo: { description: string } = {
      description: `Staging: ${gitHubUrls.staging} | Production: ${gitHubUrls.prod}`,
    }

    it("should return the urls of the site from the deployments table", async () => {
      // Arrange
      const expected = {
        staging: deployment.stagingUrl,
        prod: deployment.productionUrl,
      }
      const mockSiteWithDeployment = {
        ...mockSite,
        deployment,
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite,
        ["staging", "prod"]
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).not.toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).not.toHaveBeenCalled()
    })

    it("should return the urls of the site from the _config.yml file", async () => {
      // Arrange
      const expected = {
        staging: configYmlData.staging,
        prod: configYmlData.prod,
      }
      const mockSiteWithNullDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: null,
          productionUrl: null,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: configYmlData,
      })

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite,
        ["staging", "prod"]
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).not.toHaveBeenCalled()
    })

    it("should return the urls of the site from the GitHub repo description", async () => {
      // Arrange
      const expected = {
        staging: gitHubUrls.staging,
        prod: gitHubUrls.prod,
      }
      const mockSiteWithNullDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: null,
          productionUrl: null,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite,
        ["staging", "prod"]
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should return empty strings as urls of the site if all fails", async () => {
      // Arrange
      const expected = {
        staging: "",
        prod: "",
      }
      const mockSiteWithNullDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: null,
          productionUrl: null,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({})

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite,
        ["staging", "prod"]
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })
  })

  describe("getSites", () => {
    it("Filters accessible sites for github user correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = "3"

      const expectedResp = [
        {
          lastUpdated: repoInfo.pushed_at,
          permissions: repoInfo.permissions,
          repoName: repoInfo.name,
          isPrivate: repoInfo.private,
        },
        {
          lastUpdated: repoInfo2.pushed_at,
          permissions: repoInfo2.permissions,
          repoName: repoInfo2.name,
          isPrivate: repoInfo2.private,
        },
      ]
      MockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Filters accessible sites for email user correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = "3"

      const expectedResp: RepositoryData[] = [
        {
          lastUpdated: repoInfo.pushed_at,
          permissions: repoInfo.permissions,
          repoName: repoInfo.name,
          isPrivate: repoInfo.private,
        },
      ]
      MockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      MockUsersService.findSitesByUserId.mockImplementationOnce(() => ({
        site_members: [{ repo: { name: repoInfo.name } }],
      }))
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Filters accessible sites for email user with no sites correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = "3"

      const expectedResp: RepositoryData[] = []
      MockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      MockUsersService.findSitesByUserId.mockImplementationOnce(() => null)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(MockUsersService.findSitesByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Returns all accessible sites for admin user correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = "3"

      const expectedResp = [
        {
          lastUpdated: repoInfo.pushed_at,
          permissions: repoInfo.permissions,
          repoName: repoInfo.name,
          isPrivate: repoInfo.private,
        },
        {
          lastUpdated: repoInfo2.pushed_at,
          permissions: repoInfo2.permissions,
          repoName: repoInfo2.name,
          isPrivate: repoInfo2.private,
        },
      ]
      MockIsomerAdminsService.getByUserId.mockImplementationOnce(() => "user")
      MockUsersService.findSitesByUserId.mockImplementationOnce(() => [
        repoInfo.name,
        repoInfo2.name,
      ])
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })
  })

  describe("checkHasAccessForGitHubUser", () => {
    it("Checks if a user has access to a site", async () => {
      await expect(
        SitesService.checkHasAccessForGitHubUser(mockUserWithSiteSessionData)
      ).resolves.not.toThrow()

      expect(MockGithubService.checkHasAccess).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getLastUpdated", () => {
    it("Checks when site was last updated", async () => {
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      await expect(
        SitesService.getLastUpdated(mockUserWithSiteSessionData)
      ).resolves.toEqual(repoInfo.pushed_at)

      expect(MockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getStagingUrl", () => {
    const stagingUrl = "https://repo-staging.netlify.app"

    it("should return the staging URL if it is available", async () => {
      // Arrange
      const mockSiteWithDeployment = {
        ...mockSite,
        deployment: { stagingUrl },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)

      // Act
      const actual = await SitesService.getStagingUrl(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(stagingUrl)
      expect(MockRepository.findOne).toHaveBeenCalled()
    })

    it("should throw an error when the staging url for a repo is not found", async () => {
      // Arrange
      const mockSiteWithNullDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: null,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({})

      // Act
      await expect(
        SitesService.getStagingUrl(mockUserWithSiteSessionData)
      ).rejects.toThrowError(NotFoundError)

      // Assert
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })
  })

  describe("getSiteInfo", () => {
    const stagingUrl = "https://repo-staging.netlify.app"
    const productionUrl = "https://repo-prod.netlify.app"
    const mockSiteWithDeployment = {
      ...mockSite,
      deployment: {
        stagingUrl,
        productionUrl,
      },
    }

    it("should return the site info if authors are email login users", async () => {
      // Arrange
      const mockStagingCommit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress1,
          date: mockGitHubDate1,
        },
        message: JSON.stringify(mockCommitMessageObject1),
      }
      const mockProductionCommit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress2,
          date: mockGitHubDate2,
        },
        message: JSON.stringify(mockCommitMessageObject2),
      }
      const expected: SiteInfo = {
        savedAt: new Date(mockGitHubDate1).getTime(),
        savedBy: mockGitHubEmailAddress1,
        publishedAt: new Date(mockGitHubDate2).getTime(),
        publishedBy: mockGitHubEmailAddress2,
        stagingUrl,
        siteUrl: productionUrl,
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockStagingCommit
      )
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockProductionCommit
      )
      MockUsersService.findById.mockResolvedValueOnce(mockSessionDataEmailUser)

      // Act
      const actual = await SitesService.getSiteInfo(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockGithubService.getLatestCommitOfBranch).toHaveBeenCalledTimes(2)
      expect(MockUsersService.findById).toHaveBeenCalled()
    })

    it("should return the site info if authors are GitHub login users", async () => {
      // Arrange
      const mockStagingCommit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress1,
          date: mockGitHubDate1,
        },
        message: mockCommitMessage1,
      }
      const mockProductionCommit: GitHubCommitData = {
        author: {
          email: mockGitHubEmailAddress2,
          date: mockGitHubDate2,
        },
        message: mockCommitMessage2,
      }
      const expected: SiteInfo = {
        savedAt: new Date(mockGitHubDate1).getTime(),
        savedBy: mockGitHubEmailAddress1,
        publishedAt: new Date(mockGitHubDate2).getTime(),
        publishedBy: mockGitHubEmailAddress2,
        stagingUrl,
        siteUrl: productionUrl,
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockStagingCommit
      )
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockProductionCommit
      )

      // Act
      const actual = await SitesService.getSiteInfo(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockGithubService.getLatestCommitOfBranch).toHaveBeenCalledTimes(2)
      expect(MockUsersService.findById).not.toHaveBeenCalled()
    })

    it("should return empty values when the site info is not found", async () => {
      // Arrange
      const expected: SiteInfo = {
        savedAt: 0,
        savedBy: "Unknown Author",
        publishedAt: 0,
        publishedBy: "Unknown Author",
        stagingUrl: "",
        siteUrl: "",
      }
      const mockEmptyCommit: GitHubCommitData = {
        author: {
          email: "",
          date: "",
        },
        message: "",
      }

      MockRepository.findOne.mockResolvedValueOnce({})
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockEmptyCommit
      )
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockEmptyCommit
      )

      // Act
      const actual = await SitesService.getSiteInfo(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockGithubService.getLatestCommitOfBranch).toHaveBeenCalledTimes(2)
      expect(MockUsersService.findById).not.toHaveBeenCalled()
    })
  })
})
