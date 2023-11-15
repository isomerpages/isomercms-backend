import { AxiosCacheInstance } from "axios-cache-interceptor"

import {
  mockAccessToken,
  mockIsomerUserId,
  mockSiteName,
  mockTreeSha,
  mockUserWithSiteSessionData,
} from "@root/fixtures/sessionData"

import GitHubCommitService from "../GithubCommitService"

// using es6 gives some error
const { Base64 } = require("js-base64")

const BRANCH_REF = "staging"

describe("Github Service", () => {
  const siteName = mockSiteName
  const accessToken = mockAccessToken
  const fileName = "test-file"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const directoryName = `_${collectionName}`
  const sha = "12345"
  const treeSha = mockTreeSha
  const content = "test-content"

  const userId = mockIsomerUserId
  const subDirectoryName = `files/parent-file/sub-directory`
  const subDirectoryFileName = ".keep"
  const resourceCategoryName = "resources/some-folder"
  const topLevelDirectoryFileName = "collection.yml"
  const resourceCategoryFileName = "index.html"

  const sessionData = mockUserWithSiteSessionData

  const authHeader = {
    headers: {
      Authorization: `token ${accessToken}`,
    },
  }

  const mockAxiosInstance = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  }
  const service = new GitHubCommitService(
    /**
     * type casting here as it we only really need to mock the
     * functions that we use + do not need to maintain a full
     * list of axios functions
     */
    (mockAxiosInstance as Partial<AxiosCacheInstance>) as AxiosCacheInstance
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // describe("create", () => {
  //   const mockSuperCreate = jest.fn()
  //   const mockIsFileAsset = jest.fn()
  //   const mockIsReduceBuildTimesWhitelistedRepo = jest.fn()

  //   // Mock the super.create method
  //   GitFileSystemService.prototype.create = mockSuperCreate

  //   // Mock the isFileAsset and isReduceBuildTimesWhitelistedRepo functions
  //   global.isFileAsset = mockIsFileAsset
  //   global.isReduceBuildTimesWhitelistedRepo = mockIsReduceBuildTimesWhitelistedRepo

  //   it("should create a file in the staging branch", async () => {
  //     const sessionData = { growthbook: "fake-repo" }
  //     const fileData = {
  //       content: "file content",
  //       fileName: "file.txt",
  //       directoryName: "directory",
  //       isMedia: false,
  //     }

  //     mockSuperCreate.mockResolvedValueOnce({ sha: "fake-sha" })
  //     mockIsFileAsset.mockReturnValueOnce(false)
  //     mockIsReduceBuildTimesWhitelistedRepo.mockReturnValueOnce(false)

  //     const result = await GitFileSystemService.create(sessionData, fileData)

  //     expect(mockSuperCreate).toHaveBeenCalledWith(sessionData, {
  //       ...fileData,
  //       branchName: STAGING_BRANCH,
  //     })
  //     expect(result).toEqual({ sha: "fake-sha" })
  //   })

  //   it("should create a file in both the staging and staging-lite branches if conditions are met", async () => {
  //     const sessionData = { growthbook: "fake-repo" }
  //     const fileData = {
  //       content: "file content",
  //       fileName: "file.txt",
  //       directoryName: "directory",
  //       isMedia: false,
  //     }

  //     mockSuperCreate.mockResolvedValueOnce({ sha: "fake-sha" })
  //     mockSuperCreate.mockResolvedValueOnce({ sha: "fake-sha-lite" })
  //     mockIsFileAsset.mockReturnValueOnce(false)
  //     mockIsReduceBuildTimesWhitelistedRepo.mockReturnValueOnce(true)

  //     const result = await GitFileSystemService.create(sessionData, fileData)

  //     expect(mockSuperCreate).toHaveBeenCalledWith(sessionData, {
  //       ...fileData,
  //       branchName: STAGING_BRANCH,
  //     })
  //     expect(mockSuperCreate).toHaveBeenCalledWith(sessionData, {
  //       ...fileData,
  //       branchName: STAGING_LITE_BRANCH,
  //     })
  //     expect(result).toEqual({ sha: "fake-sha" })
  //   })
  // })
})
