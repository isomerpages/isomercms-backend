import { ConflictError } from "@errors/ConflictError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import validateStatus from "@utils/axios-utils"

import {
  mockUserWithSiteSessionData,
  mockSiteName,
  mockAccessToken,
  mockTreeSha,
  mockGithubId,
  mockCurrentCommitSha,
  mockGithubSessionData,
  mockIsomerUserId,
} from "@fixtures/sessionData"
import { ForbiddenError } from "@root/errors/ForbiddenError"
import { indexHtmlContent } from "@root/fixtures/markdown-fixtures"
import { collectionYmlContent } from "@root/fixtures/yaml-fixtures"
import { GitHubService } from "@services/db/GitHubService"

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

  const service = new GitHubService({
    axiosInstance: mockAxiosInstance,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getFilePath", () => {
    it("should retrieve the right unlinked page file path", async () => {
      expect(
        service.getFilePath({ siteName, fileName, directoryName: undefined })
      ).toEqual(`${siteName}/contents/${fileName}`)
    })

    it("should retrieve the right collection page file path", async () => {
      expect(
        service.getFilePath({ siteName, fileName, directoryName })
      ).toEqual(`${siteName}/contents/${directoryName}/${fileName}`)
    })

    it("should retrieve the right subcollection page file path", async () => {
      const subcollectionPath = `_${collectionName}/${subcollectionName}`
      expect(
        service.getFilePath({
          siteName,
          fileName,
          directoryName: subcollectionPath,
        })
      ).toEqual(`${siteName}/contents/${subcollectionPath}/${fileName}`)
    })
  })

  describe("getFolderPath", () => {
    it("should retrieve the right folder path", async () => {
      expect(service.getFolderPath({ siteName, directoryName })).toEqual(
        `${siteName}/contents/${directoryName}`
      )
    })

    it("should retrieve the right folder path even with special characters", async () => {
      const specialDirName = `special?/direct ory`
      const specialParsedDirName = `${encodeURIComponent(
        "special?"
      )}/${encodeURIComponent("direct ory")}`
      expect(
        service.getFolderPath({ siteName, directoryName: specialDirName })
      ).toEqual(`${siteName}/contents/${specialParsedDirName}`)
    })
  })

  describe("Create", () => {
    const fileParentEndpoint = `${siteName}/contents/files/parent-file`
    const folderParentEndpoint = `${siteName}/contents/${directoryName}`
    const folderEndpoint = `${folderParentEndpoint}/${fileName}`
    const resourceRoomEndpoint = `${siteName}/contents/${resourceCategoryName}`
    const encodedContent = Base64.encode(content)

    const message = JSON.stringify({
      message: `Create file: ${fileName}`,
      fileName,
      userId,
    })
    const params = {
      message,
      content: encodedContent,
      branch: BRANCH_REF,
    }

    const collectionYmlMessage = JSON.stringify({
      message: `Create file: ${topLevelDirectoryFileName}`,
      fileName: topLevelDirectoryFileName,
      userId,
    })

    const resourceRoomParams = {
      message: collectionYmlMessage,
      content: Base64.encode(collectionYmlContent),
      branch: params.branch,
    }
    const topLevelFolderEndpoint = `${folderParentEndpoint}/${topLevelDirectoryFileName}`

    const resourceRoomMessage = JSON.stringify({
      message: `Create file: ${resourceCategoryFileName}`,
      fileName: resourceCategoryFileName,
      userId,
    })
    const resourceCategoryParams = {
      message: resourceRoomMessage,
      content: Base64.encode(indexHtmlContent),
      branch: params.branch,
    }
    const resourceRoomFolderEndpoint = `${folderParentEndpoint}/${resourceCategoryFileName}`

    it("should create a file works correctly", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockResolvedValueOnce(resp)
      mockAxiosInstance.get.mockResolvedValueOnce("")
      await expect(
        service.create(sessionData, {
          content,
          fileName,
          directoryName,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        folderEndpoint,
        params,
        authHeader
      )
    })

    it("should create a top level folder works correctly", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockResolvedValueOnce(resp)
      await expect(
        service.create(sessionData, {
          content: collectionYmlContent,
          fileName: topLevelDirectoryFileName,
          directoryName,
        })
      ).resolves.toMatchObject({
        sha,
      })

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        topLevelFolderEndpoint,
        resourceRoomParams,
        authHeader
      )
    })

    it("should create a resource category works correctly", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockResolvedValueOnce(resp)
      await expect(
        service.create(sessionData, {
          content: indexHtmlContent,
          fileName: resourceCategoryFileName,
          directoryName,
        })
      ).resolves.toMatchObject({
        sha,
      })

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        resourceRoomFolderEndpoint,
        resourceCategoryParams,
        authHeader
      )
    })

    it("should create a media file does not encode it", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce("")
      mockAxiosInstance.put.mockResolvedValueOnce(resp)
      await expect(
        service.create(sessionData, {
          content,
          fileName,
          directoryName,
          isMedia: true,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        folderEndpoint,
        {
          ...params,
          content,
        },
        authHeader
      )
    })

    it("should parse and throw the correct error in case of a conflict", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      mockAxiosInstance.put.mockImplementation(() => {
        const error = {
          response: {
            status: 422,
          },
        }
        throw error
      })
      await expect(
        service.create(sessionData, {
          content,
          fileName,
          directoryName,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        folderEndpoint,
        params,
        authHeader
      )
    })

    it("should throw an error if parent directory is deleted", async () => {
      mockAxiosInstance.get.mockImplementation(() => {
        throw new NotFoundError()
      })
      await expect(
        service.create(sessionData, {
          content,
          fileName,
          directoryName,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(folderParentEndpoint, {
        validateStatus,
        headers: authHeader.headers,
        params: {
          ref: BRANCH_REF,
        },
      })
    })

    it("should throw an error if a new sub directory is created while the parent directory is deleted", async () => {
      mockAxiosInstance.get.mockImplementation(() => {
        throw new NotFoundError()
      })

      await expect(
        service.create(sessionData, {
          content,
          fileName: subDirectoryFileName,
          directoryName: subDirectoryName,
        })
      ).rejects.toThrowError()
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(fileParentEndpoint, {
        validateStatus,
        headers: authHeader.headers,
        params: {
          ref: BRANCH_REF,
        },
      })
    })

    it("should throw an error if a resource is created while the resource folder is deleted", async () => {
      mockAxiosInstance.get.mockImplementation(() => {
        throw new NotFoundError()
      })
      await expect(
        service.create(sessionData, {
          content,
          fileName,
          directoryName: `${resourceCategoryName}/_posts`,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(resourceRoomEndpoint, {
        validateStatus,
        headers: authHeader.headers,
        params: {
          ref: BRANCH_REF,
        },
      })
    })
  })

  describe("Read", () => {
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const encodedContent = Base64.encode(content)
    const params = {
      ref: BRANCH_REF,
    }

    it("should read a file works correctly", async () => {
      const resp = {
        data: {
          content: encodedContent,
          sha,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.read(sessionData, {
          fileName,
          directoryName,
        })
      ).resolves.toMatchObject({
        content,
        sha,
      })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })

    it("should throw the correct error if file cannot be found", async () => {
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.read(sessionData, {
          fileName,
          directoryName,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })
  })

  describe("ReadMedia", () => {
    const endpoint = `${siteName}/git/blobs/${sha}`
    const params = {
      ref: BRANCH_REF,
    }

    it("should read a media file works correctly", async () => {
      const resp = {
        data: {
          content,
          sha,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.readMedia(sessionData, {
          fileSha: sha,
        })
      ).resolves.toMatchObject({
        content,
        sha,
      })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })

    it("should throw the correct error if file cannot be found", async () => {
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.readMedia(sessionData, {
          fileSha: sha,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })
  })

  describe("ReadDirectory", () => {
    const endpoint = `${siteName}/contents/${directoryName}`
    const params = {
      ref: BRANCH_REF,
    }

    it("should read a directory correctly", async () => {
      const data = "test-data"
      const resp = {
        data,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.readDirectory(sessionData, {
          directoryName,
        })
      ).resolves.toEqual(data)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })

    it("should throw the correct error if directory cannot be found", async () => {
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.readDirectory(sessionData, {
          directoryName,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })
  })

  describe("Update", () => {
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const encodedContent = Base64.encode(content)
    const message = JSON.stringify({
      message: `Update file: ${fileName}`,
      fileName,
      userId,
    })
    const params = {
      message,
      content: encodedContent,
      branch: BRANCH_REF,
      sha,
    }

    it("should update a file correctly", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockResolvedValueOnce(resp)
      await expect(
        service.update(sessionData, {
          fileName,
          directoryName,
          fileContent: content,
          sha,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        endpoint,
        params,
        authHeader
      )
    })

    it("should throw the correct error if file cannot be found", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      mockAxiosInstance.put.mockImplementation(() => {
        const err = {
          response: {
            status: 404,
          },
        }
        throw err
      })
      await expect(
        service.update(sessionData, {
          fileName,
          directoryName,
          fileContent: content,
          sha,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        endpoint,
        params,
        authHeader
      )
    })

    it("should update a file with no sha works correctly", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      const getResp = {
        data: {
          content: encodedContent,
          sha,
        },
      }
      const putResp = {
        data: {
          content: {
            sha,
          },
        },
      }
      const readParams = {
        ref: BRANCH_REF,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(getResp)
      mockAxiosInstance.put.mockResolvedValueOnce(putResp)
      await expect(
        service.update(sessionData, {
          fileName,
          directoryName,
          fileContent: content,
          sha: undefined,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params: readParams,
        headers: authHeader.headers,
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        endpoint,
        params,
        authHeader
      )
    })

    it("should update with no sha provided throws the correct error if file cannot be found", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      const readParams = {
        ref: BRANCH_REF,
      }
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.update(sessionData, {
          fileName,
          directoryName,
          fileContent: content,
          sha: undefined,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params: readParams,
        headers: authHeader.headers,
      })
    })
  })

  describe("Delete", () => {
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const message = JSON.stringify({
      message: `Delete file: ${fileName}`,
      fileName,
      userId,
    })
    const params = {
      message,
      branch: BRANCH_REF,
      sha,
    }

    it("should delete a file correctly", async () => {
      await service.delete(sessionData, {
        fileName,
        directoryName,
        sha,
      })
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(endpoint, {
        params,
        headers: authHeader.headers,
      })
    })

    it("should throw the correct error if file cannot be found", async () => {
      mockAxiosInstance.delete.mockImplementation(() => {
        const err = {
          response: {
            status: 404,
          },
        }
        throw err
      })
      await expect(
        service.delete(sessionData, {
          fileName,
          directoryName,
          sha,
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(endpoint, {
        params,
        headers: authHeader.headers,
      })
    })
  })

  describe("GetRepoInfo", () => {
    const endpoint = `${siteName}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
    }

    it("should get repo info works correctly", async () => {
      const resp = {
        data: {
          private: true,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await service.getRepoInfo(sessionData)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        params,
        headers,
      })
    })
  })

  describe("GetRepoState", () => {
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
    }

    it("should get a repo state works correctly", async () => {
      const resp = {
        data: [
          {
            commit: {
              tree: {
                sha,
              },
            },
          },
        ],
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await service.getRepoState(sessionData)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        params,
        headers,
      })
    })
  })

  describe("getLatestCommitOfBranch", () => {
    const endpoint = `${siteName}/commits/staging`
    const headers = {
      Authorization: `token ${accessToken}`,
    }

    it("should get the latest commit of branch works correctly", async () => {
      const expected = {
        author: {
          name: "test",
        },
      }
      const resp = {
        data: {
          commit: expected,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      const actual = await service.getLatestCommitOfBranch(
        sessionData,
        "staging"
      )
      expect(actual).toEqual(expected)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        headers,
      })
    })

    it("should throw UnprocessableError when getting an invalid branch", async () => {
      mockAxiosInstance.get.mockImplementationOnce(() => {
        const err = {
          response: {
            status: 422,
          },
        }
        throw err
      })
      await expect(
        service.getLatestCommitOfBranch(sessionData, "staging")
      ).rejects.toThrowError(UnprocessableError)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        headers,
      })
    })

    it("should throw the original error when getting other kinds of errors", async () => {
      mockAxiosInstance.get.mockImplementationOnce(() => {
        const err = new Error()
        throw err
      })
      await expect(
        service.getLatestCommitOfBranch(sessionData, "staging")
      ).rejects.toThrowError()
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        headers,
      })
    })
  })

  describe("GetTree", () => {
    const url = `${siteName}/git/trees/${treeSha}`

    const params = {
      ref: BRANCH_REF,
    }

    const headers = {
      Authorization: `token ${accessToken}`,
    }

    const tree = "test-tree"

    it("should get a repo tree correctly", async () => {
      const resp = {
        data: {
          tree,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.getTree(sessionData, mockGithubSessionData, {
          isRecursive: false,
        })
      ).resolves.toEqual(tree)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(url, {
        params,
        headers,
      })
    })

    it("should get the repo state recursively correctly", async () => {
      const resp = {
        data: {
          tree,
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(resp)
      await expect(
        service.getTree(sessionData, mockGithubSessionData, {
          isRecursive: true,
        })
      ).resolves.toEqual(tree)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(url, {
        params: {
          ...params,
          recursive: true,
        },
        headers,
      })
    })
  })

  describe("UpdateTree", () => {
    const url = `${siteName}/git/trees`
    const commitEndpoint = `${siteName}/git/commits`

    it("should update a repo tree correctly", async () => {
      const firstSha = "first-sha"
      const secondSha = "second-sha"
      const gitTree = "git-tree"
      const message = "message"
      const finalExpectedMessage = JSON.stringify({
        message,
        userId,
      })
      const firstResp = {
        data: {
          sha: firstSha,
        },
      }

      const secondResp = {
        data: {
          sha: secondSha,
        },
      }
      mockAxiosInstance.post
        .mockResolvedValueOnce(firstResp)
        .mockResolvedValueOnce(secondResp)
      await expect(
        service.updateTree(sessionData, mockGithubSessionData, {
          gitTree,
          message,
        })
      ).resolves.toEqual(secondSha)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        url,
        {
          tree: gitTree,
          base_tree: treeSha,
        },
        authHeader
      )
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        commitEndpoint,
        {
          message: finalExpectedMessage,
          tree: firstSha,
          parents: [mockCurrentCommitSha],
        },
        authHeader
      )
    })
  })

  describe("updateRepoState", () => {
    const refEndpoint = `${siteName}/git/refs/heads/${BRANCH_REF}`

    it("should update a repo state correctly", async () => {
      await service.updateRepoState(sessionData, { commitSha: sha })
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        refEndpoint,
        { sha, force: true },
        authHeader
      )
    })
  })

  describe("checkHasAccess", () => {
    const refEndpoint = `${siteName}/collaborators/${mockGithubId}`
    const headers = {
      Authorization: `token ${accessToken}`,
      "Content-Type": "application/json",
    }
    it("should check whether user has write access to site", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce("")
      await service.checkHasAccess(sessionData)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(refEndpoint, {
        headers,
      })
    })
  })

  describe("changeRepoPrivacy", () => {
    const refEndpoint = `${siteName}`
    const headers = {
      Authorization: "",
      "Content-Type": "application/json",
    }
    it("should modify the repo privacy accordingly if changing to true", async () => {
      const shouldBePrivate = true
      mockAxiosInstance.patch.mockResolvedValueOnce("")
      const resp = await service.changeRepoPrivacy(sessionData, shouldBePrivate)
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        refEndpoint,
        { private: shouldBePrivate },
        {
          headers,
        }
      )
      expect(resp.isOk()).toEqual(true)
    })

    it("should modify the repo privacy accordingly if changing to false", async () => {
      const shouldBePrivate = false
      mockAxiosInstance.patch.mockResolvedValueOnce("")
      const resp = await service.changeRepoPrivacy(sessionData, shouldBePrivate)
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        refEndpoint,
        { private: shouldBePrivate },
        {
          headers,
        }
      )
      expect(resp.isOk()).toEqual(true)
    })
  })
})
