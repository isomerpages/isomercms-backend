import { ModelStatic } from "sequelize"

import { Site } from "@database/models"
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
} from "@fixtures/sessionData"
import mockAxios from "@mocks/axios"
import { NotFoundError } from "@root/errors/NotFoundError"
import type { RepositoryData } from "@root/types/repoInfo"
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
  getRepoInfo: jest.fn(),
}

const MockConfigYmlService = {
  read: jest.fn(),
}

const MockUsersService = {
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
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("getBySiteName", () => {
    it("should call the findOne method of the db model to get the siteName", async () => {
      // Arrange
      const expected = mockSite
      MockRepository.findOne.mockResolvedValue(mockSite)

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
      mockAxios.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxios.get.mockResolvedValueOnce({ data: [] })
      mockAxios.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(mockAxios.get).toHaveBeenCalledTimes(3)
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
      mockAxios.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxios.get.mockResolvedValueOnce({ data: [] })
      mockAxios.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxios.get).toHaveBeenCalledTimes(3)
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
      mockAxios.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxios.get.mockResolvedValueOnce({ data: [] })
      mockAxios.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(MockUsersService.findSitesByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxios.get).toHaveBeenCalledTimes(3)
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
      mockAxios.get.mockResolvedValueOnce({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      })
      mockAxios.get.mockResolvedValueOnce({ data: [] })
      mockAxios.get.mockResolvedValueOnce({ data: [] })

      await expect(
        SitesService.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(MockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockAxios.get).toHaveBeenCalledTimes(3)
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
      MockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

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
    it("Retrieves the staging url for a site from config if available with higher priority over the description", async () => {
      MockConfigYmlService.read.mockResolvedValue({
        content: {
          staging: stagingUrl,
        },
      })
      MockGithubService.getRepoInfo.mockResolvedValue(repoInfo2)

      await expect(
        SitesService.getStagingUrl(mockUserWithSiteSessionData)
      ).resolves.toEqual(stagingUrl)

      expect(MockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
    it("Retrieves the staging url for a site from repo info otherwise", async () => {
      MockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

      await expect(
        SitesService.getStagingUrl(mockUserWithSiteSessionData)
      ).resolves.toEqual(stagingUrl)

      expect(MockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
      expect(MockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
    it("throws an error when the staging url for a repo is not found", async () => {
      MockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValue({
        description: "edited description",
      })

      await expect(
        SitesService.getStagingUrl(mockUserWithSiteSessionData)
      ).rejects.toThrowError(NotFoundError)

      expect(MockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
      expect(MockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })
})
