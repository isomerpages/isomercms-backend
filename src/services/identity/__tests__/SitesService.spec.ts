import { ModelStatic } from "sequelize"

import { Deployment, Site, User, Repo } from "@database/models"
import {
  MOCK_COMMIT_MESSAGE_OBJECT_ONE,
  MOCK_COMMIT_MESSAGE_OBJECT_TWO,
  MOCK_GITHUB_NAME_ONE,
  MOCK_GITHUB_NAME_TWO,
  MOCK_GITHUB_EMAIL_ADDRESS_ONE,
  MOCK_GITHUB_EMAIL_ADDRESS_TWO,
  MOCK_GITHUB_DATE_ONE,
  MOCK_GITHUB_DATE_TWO,
  MOCK_COMMIT_MESSAGE_ONE,
  MOCK_COMMIT_MESSAGE_TWO,
  MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME,
} from "@fixtures/identity"
import {
  repoInfo,
  repoInfo2,
  adminRepo,
  noAccessRepo,
  MOCK_STAGING_URL_CONFIGYML,
  MOCK_PRODUCTION_URL_CONFIGYML,
  MOCK_PRODUCTION_URL_DB,
  MOCK_STAGING_URL_DB,
  MOCK_STAGING_URL_GITHUB,
  MOCK_PRODUCTION_URL_GITHUB,
} from "@fixtures/repoInfo"
import {
  mockUserWithSiteSessionData,
  mockSessionDataEmailUser,
  mockIsomerUserId,
  mockEmail,
  mockSessionDataEmailUserWithSite,
} from "@fixtures/sessionData"
import mockAxios from "@mocks/axios"
import { NotFoundError } from "@root/errors/NotFoundError"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import { UnprocessableError } from "@root/errors/UnprocessableError"
import ReviewRequestService from "@root/services/review/ReviewRequestService"
import { GitHubCommitData } from "@root/types/commitData"
import { ConfigYmlData } from "@root/types/configYml"
import type { RepositoryData, SiteUrls } from "@root/types/repoInfo"
import { SiteInfo } from "@root/types/siteInfo"
import { GitHubService } from "@services/db/GitHubService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import _SitesService from "@services/identity/SitesService"
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

const MockReviewRequestService = {
  getLatestMergedReviewRequest: jest.fn(),
}

const SitesService = new _SitesService({
  siteRepository: (MockRepository as unknown) as ModelStatic<Site>,
  gitHubService: (MockGithubService as unknown) as GitHubService,
  configYmlService: (MockConfigYmlService as unknown) as ConfigYmlService,
  usersService: (MockUsersService as unknown) as UsersService,
  isomerAdminsService: (MockIsomerAdminsService as unknown) as IsomerAdminsService,
  reviewRequestService: (MockReviewRequestService as unknown) as ReviewRequestService,
})

const SpySitesService = {
  extractAuthorEmail: jest.spyOn(SitesService, "extractAuthorEmail"),
}

const mockSiteName = "some site name"
const mockSite = ({
  name: "i m a site",
  apiTokenName: "0000",
  users: [],
} as unknown) as Site

describe("SitesService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("extractAuthorEmail", () => {
    it("should return the email address of the author of the commit", () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commitData: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }

      // Act
      const actual = SitesService.extractAuthorEmail(commitData)

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("insertUrlsFromConfigYml", () => {
    it("should insert URLs if both are not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_CONFIGYML,
        prod: MOCK_PRODUCTION_URL_CONFIGYML,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const configYmlResponse = {
        content: {
          staging: MOCK_STAGING_URL_CONFIGYML,
          prod: MOCK_PRODUCTION_URL_CONFIGYML,
        },
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })

    it("should only insert staging URL if it is not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_CONFIGYML,
        prod: MOCK_PRODUCTION_URL_DB,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: MOCK_PRODUCTION_URL_DB,
      }
      const configYmlResponse = {
        content: {
          staging: MOCK_STAGING_URL_CONFIGYML,
          prod: MOCK_PRODUCTION_URL_CONFIGYML,
        },
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })

    it("should only insert production URL if it is not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_CONFIGYML,
      }
      const initial: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: "",
      }
      const configYmlResponse = {
        content: {
          staging: MOCK_STAGING_URL_CONFIGYML,
          prod: MOCK_PRODUCTION_URL_CONFIGYML,
        },
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })

    it("should not insert URLs if both are already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_DB,
      }
      const initial: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_DB,
      }

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).not.toHaveBeenCalled()
    })

    it("should not insert staging URL if it does not exist in config.yml", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: "",
        prod: MOCK_PRODUCTION_URL_CONFIGYML,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const configYmlResponse = {
        content: {
          prod: MOCK_PRODUCTION_URL_CONFIGYML,
        },
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })

    it("should not insert production URL if it does not exist in config.yml", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_CONFIGYML,
        prod: "",
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const configYmlResponse = {
        content: {
          staging: MOCK_STAGING_URL_CONFIGYML,
        },
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })

    it("should not insert URLs if config.yml does not contain both staging and production URLs", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: "",
        prod: "",
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const configYmlResponse = {
        content: {},
        sha: "abc",
      }
      MockConfigYmlService.read.mockResolvedValueOnce(configYmlResponse)

      // Act
      const actual = await SitesService.insertUrlsFromConfigYml(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockConfigYmlService.read).toHaveBeenCalled()
    })
  })

  describe("insertUrlsFromGitHubDescription", () => {
    it("should insert URLs if both are not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_GITHUB,
        prod: MOCK_PRODUCTION_URL_GITHUB,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should only insert staging URL if it is not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_GITHUB,
        prod: MOCK_PRODUCTION_URL_DB,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: MOCK_PRODUCTION_URL_DB,
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should only insert production URL if it is not already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_GITHUB,
      }
      const initial: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: "",
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should not insert URLs if both are already present", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_DB,
      }
      const initial: SiteUrls = {
        staging: MOCK_STAGING_URL_DB,
        prod: MOCK_PRODUCTION_URL_DB,
      }

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).not.toHaveBeenCalled()
    })

    it("should not insert staging URL if it does not exist in the description", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: "",
        prod: MOCK_PRODUCTION_URL_CONFIGYML,
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const repoInfoWithoutStagingUrl = {
        description: `Production: ${MOCK_PRODUCTION_URL_CONFIGYML}`,
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(
        repoInfoWithoutStagingUrl
      )

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should not insert production URL if it does not exist in the description", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: MOCK_STAGING_URL_CONFIGYML,
        prod: "",
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const repoInfoWithoutProductionUrl = {
        description: `Staging: ${MOCK_STAGING_URL_CONFIGYML}`,
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(
        repoInfoWithoutProductionUrl
      )

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should not insert URLs if description is empty", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: "",
        prod: "",
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const repoInfoWithoutDescription = {
        description: "",
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(
        repoInfoWithoutDescription
      )

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should not insert URLs if description is some gibberish", async () => {
      // Arrange
      const expected: SiteUrls = {
        staging: "",
        prod: "",
      }
      const initial: SiteUrls = {
        staging: "",
        prod: "",
      }
      const repoInfoWithGibberishDescription = {
        description: "abcdefghijklmnopqrstuvwxyz-staging and-prod",
      }
      MockGithubService.getRepoInfo.mockResolvedValueOnce(
        repoInfoWithGibberishDescription
      )

      // Act
      const actual = await SitesService.insertUrlsFromGitHubDescription(
        initial,
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })
  })

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
        include: [
          {
            model: Repo,
            required: true,
            where: {
              name: mockSiteName,
            },
          },
        ],
      })
    })
  })

  describe("getSitesForEmailUser", () => {
    it("should call the findSitesByUserId method of UsersService to get the sites for the user", async () => {
      // Arrange
      const expected = [mockSiteName]
      const mockUserWithSites = {
        site_members: [
          {
            repo: {
              name: mockSiteName,
            },
          },
        ],
      }
      MockUsersService.findSitesByUserId.mockResolvedValueOnce(
        mockUserWithSites
      )

      // Act
      const actual = await SitesService.getSitesForEmailUser(mockIsomerUserId)

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersService.findSitesByUserId).toBeCalledWith(
        mockIsomerUserId
      )
    })
  })

  describe("getCommitAuthorEmail", () => {
    it("should return the email of the commit author who is an email login user", async () => {
      // Arrange
      const expected = mockEmail
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_ONE),
      }
      MockUsersService.findById.mockResolvedValueOnce(mockSessionDataEmailUser)

      // Act
      const actual = await SitesService.getCommitAuthorEmail(commit)

      // Assert
      expect(actual).toBe(expected)
      expect(MockUsersService.findById).toHaveBeenCalledWith(mockIsomerUserId)
      expect(SpySitesService.extractAuthorEmail).not.toHaveBeenCalled()
    })

    it("should return the email of the commit author who is a GitHub login user", async () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }

      // Act
      const actual = await SitesService.getCommitAuthorEmail(commit)

      // Assert
      expect(actual).toBe(expected)
      expect(MockUsersService.findById).not.toHaveBeenCalled()
      expect(SpySitesService.extractAuthorEmail).toHaveBeenCalled()
    })
  })

  describe("getMergeAuthorEmail", () => {
    it("should return the email of the merge commit author if it was not performed using the common access token", async () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }

      // Act
      const actual = await SitesService.getMergeAuthorEmail(
        commit,
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        MockReviewRequestService.getLatestMergedReviewRequest
      ).not.toHaveBeenCalled()
      expect(SpySitesService.extractAuthorEmail).toHaveBeenCalled()
    })

    it("should return the email of the merge commit author if the site cannot be found", async () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }
      MockRepository.findOne.mockResolvedValueOnce(null)

      // Act
      const actual = await SitesService.getMergeAuthorEmail(
        commit,
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        MockReviewRequestService.getLatestMergedReviewRequest
      ).not.toHaveBeenCalled()
      expect(SpySitesService.extractAuthorEmail).toHaveBeenCalled()
    })

    it("should return the email of the merge commit author if there are no merged review requests", async () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }
      MockRepository.findOne.mockResolvedValueOnce(mockSite)
      MockReviewRequestService.getLatestMergedReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const actual = await SitesService.getMergeAuthorEmail(
        commit,
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        MockReviewRequestService.getLatestMergedReviewRequest
      ).toHaveBeenCalledWith(mockSite)
      expect(SpySitesService.extractAuthorEmail).toHaveBeenCalled()
    })

    it("should return the email of the requestor for the latest merged review request", async () => {
      // Arrange
      const expected = mockEmail
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }
      const mockReviewRequest = {
        requestor: {
          email: mockEmail,
        },
      }
      MockRepository.findOne.mockResolvedValueOnce(mockSite)
      MockReviewRequestService.getLatestMergedReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const actual = await SitesService.getMergeAuthorEmail(
        commit,
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        MockReviewRequestService.getLatestMergedReviewRequest
      ).toHaveBeenCalledWith(mockSite)
      expect(SpySitesService.extractAuthorEmail).not.toHaveBeenCalled()
    })

    it("should return the email of the merge commit author if the requestor for the latest merged review request does not have an email", async () => {
      // Arrange
      const expected = MOCK_GITHUB_EMAIL_ADDRESS_ONE
      const commit: GitHubCommitData = {
        author: {
          name: MOCK_COMMON_ACCESS_TOKEN_GITHUB_NAME,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }
      const mockReviewRequest = {
        requestor: {
          email: null,
        },
      }
      MockRepository.findOne.mockResolvedValueOnce(mockSite)
      MockReviewRequestService.getLatestMergedReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const actual = await SitesService.getMergeAuthorEmail(
        commit,
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(
        MockReviewRequestService.getLatestMergedReviewRequest
      ).toHaveBeenCalledWith(mockSite)
      expect(SpySitesService.extractAuthorEmail).toHaveBeenCalled()
    })
  })

  describe("getUrlsOfSite", () => {
    const deployment: Partial<Deployment> = {
      stagingUrl: MOCK_STAGING_URL_DB,
      productionUrl: MOCK_PRODUCTION_URL_DB,
    }
    const emptyDeployment: Partial<Deployment> = {
      stagingUrl: "",
      productionUrl: "",
    }
    const configYmlData: Partial<ConfigYmlData> = {
      staging: MOCK_STAGING_URL_CONFIGYML,
      prod: MOCK_PRODUCTION_URL_CONFIGYML,
    }
    const emptyConfigYmlData: Partial<ConfigYmlData> = {
      staging: "",
      prod: "",
    }
    const gitHubUrls = {
      staging: MOCK_STAGING_URL_GITHUB,
      prod: MOCK_PRODUCTION_URL_GITHUB,
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
        mockSessionDataEmailUserWithSite
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
          ...emptyDeployment,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: configYmlData,
      })

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite
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
          ...emptyDeployment,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {
          ...emptyConfigYmlData,
        },
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce(repoInfo)

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })

    it("should return a NotFoundError if all fails", async () => {
      // Arrange
      const mockSiteWithNullDeployment = {
        ...mockSite,
        deployment: {
          ...emptyDeployment,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithNullDeployment)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {
          ...emptyConfigYmlData,
        },
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({
        description: "",
      })

      // Act
      const actual = await SitesService.getUrlsOfSite(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toBeInstanceOf(NotFoundError)
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
    it("should return the staging URL if it is available", async () => {
      // Arrange
      const mockSiteWithDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: MOCK_STAGING_URL_DB,
          productionUrl: MOCK_PRODUCTION_URL_DB,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)

      // Act
      const actual = await SitesService.getStagingUrl(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(MOCK_STAGING_URL_DB)
      expect(MockRepository.findOne).toHaveBeenCalled()
    })

    it("should return an error when the staging url for a repo is not found", async () => {
      // Arrange
      MockRepository.findOne.mockResolvedValueOnce(null)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({
        description: "",
      })

      // Act
      await expect(
        SitesService.getStagingUrl(mockUserWithSiteSessionData)
      ).resolves.toBeInstanceOf(NotFoundError)

      // Assert
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })
  })

  describe("getSiteUrl", () => {
    it("should return the site URL if it is available", async () => {
      // Arrange
      const mockSiteWithDeployment = {
        ...mockSite,
        deployment: {
          stagingUrl: MOCK_STAGING_URL_DB,
          productionUrl: MOCK_PRODUCTION_URL_DB,
        },
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)

      // Act
      const actual = await SitesService.getSiteUrl(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual).toEqual(MOCK_PRODUCTION_URL_DB)
      expect(MockRepository.findOne).toHaveBeenCalled()
    })

    it("should return an error when the site url for a repo is not found", async () => {
      // Arrange
      MockRepository.findOne.mockResolvedValueOnce(null)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({
        description: "",
      })

      // Act
      await expect(
        SitesService.getSiteUrl(mockUserWithSiteSessionData)
      ).resolves.toBeInstanceOf(NotFoundError)

      // Assert
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockConfigYmlService.read).toHaveBeenCalled()
      expect(MockGithubService.getRepoInfo).toHaveBeenCalled()
    })
  })

  describe("getSiteInfo", () => {
    const mockSiteWithDeployment = {
      ...mockSite,
      deployment: {
        stagingUrl: MOCK_STAGING_URL_DB,
        productionUrl: MOCK_PRODUCTION_URL_DB,
      },
    }

    it("should return the site info if authors are email login users", async () => {
      // Arrange
      const mockStagingCommit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_ONE),
      }
      const mockStagingCommitAuthor: Partial<User> = {
        email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
      }
      const mockProductionCommit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_TWO,
          email: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
          date: MOCK_GITHUB_DATE_TWO,
        },
        message: JSON.stringify(MOCK_COMMIT_MESSAGE_OBJECT_TWO),
      }
      const mockProductionCommitAuthor: Partial<User> = {
        email: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
      }
      const expected: SiteInfo = {
        savedAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        savedBy: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
        publishedAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
        publishedBy: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
        stagingUrl: MOCK_STAGING_URL_DB,
        siteUrl: MOCK_PRODUCTION_URL_DB,
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockStagingCommit
      )
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(
        mockProductionCommit
      )
      MockUsersService.findById.mockResolvedValueOnce(mockStagingCommitAuthor)
      MockUsersService.findById.mockResolvedValueOnce(
        mockProductionCommitAuthor
      )

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
          name: MOCK_GITHUB_NAME_ONE,
          email: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          date: MOCK_GITHUB_DATE_ONE,
        },
        message: MOCK_COMMIT_MESSAGE_ONE,
      }
      const mockProductionCommit: GitHubCommitData = {
        author: {
          name: MOCK_GITHUB_NAME_TWO,
          email: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
          date: MOCK_GITHUB_DATE_TWO,
        },
        message: MOCK_COMMIT_MESSAGE_TWO,
      }
      const expected: SiteInfo = {
        savedAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        savedBy: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
        publishedAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
        publishedBy: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
        stagingUrl: MOCK_STAGING_URL_DB,
        siteUrl: MOCK_PRODUCTION_URL_DB,
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

    it("should return UnprocessableError when the site is not found", async () => {
      // Arrange
      MockRepository.findOne.mockResolvedValueOnce(null)
      MockConfigYmlService.read.mockResolvedValueOnce({
        content: {},
      })
      MockGithubService.getRepoInfo.mockResolvedValueOnce({
        description: "",
      })

      // Act
      await expect(
        SitesService.getSiteInfo(mockSessionDataEmailUserWithSite)
      ).resolves.toBeInstanceOf(UnprocessableError)

      // Assert
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockUsersService.findById).not.toHaveBeenCalled()
    })

    it("should return UnprocessableError when the GitHub commit is not found", async () => {
      // Arrange
      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(null)
      MockGithubService.getLatestCommitOfBranch.mockResolvedValueOnce(null)

      // Act
      await expect(
        SitesService.getSiteInfo(mockSessionDataEmailUserWithSite)
      ).resolves.toBeInstanceOf(UnprocessableError)

      // Assert
      expect(MockRepository.findOne).toHaveBeenCalled()
      expect(MockGithubService.getLatestCommitOfBranch).toHaveBeenCalledTimes(2)
      expect(MockUsersService.findById).not.toHaveBeenCalled()
    })

    it("should return with unknown author when the GitHub commit is empty", async () => {
      // Arrange
      const expected: SiteInfo = {
        savedAt: 0,
        savedBy: "Unknown Author",
        publishedAt: 0,
        publishedBy: "Unknown Author",
        stagingUrl: MOCK_STAGING_URL_DB,
        siteUrl: MOCK_PRODUCTION_URL_DB,
      }

      const mockEmptyCommit: GitHubCommitData = {
        author: {
          name: "",
          email: "",
          date: "",
        },
        message: "",
      }

      MockRepository.findOne.mockResolvedValueOnce(mockSiteWithDeployment)
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
