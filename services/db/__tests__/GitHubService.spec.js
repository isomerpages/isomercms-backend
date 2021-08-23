const { Base64 } = require("js-base64")

const { ConflictError } = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")

const { GitHubService } = require("@services/db/GitHubService")

const BRANCH_REF = "staging"

describe("Github Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const subcollectionFileName = "test-subcollection-file"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const directoryName = `_${collectionName}`
  const sha = "12345"
  const content = "test-content"

  const reqDetails = { siteName, accessToken }
  const orderArray = [
    `${fileName}.md`,
    `${subcollectionName}/.keep`,
    `${subcollectionName}/${subcollectionFileName}.md`,
    `${subcollectionName}/${subcollectionFileName}2.md`,
    `${fileName}2.md`,
  ]

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
    it("Retrieves the right unlinked page file path", async () => {
      expect(service.getFilePath({ siteName, fileName })).toEqual(
        `${siteName}/contents/${fileName}`
      )
    })

    it("Retrieves the right unlinked page file path", async () => {
      expect(
        service.getFilePath({ siteName, fileName, directoryName })
      ).toEqual(`${siteName}/contents/${directoryName}/${fileName}`)
    })

    it("Retrieves the right collection page file path", async () => {
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
    it("Retrieves the right folder path", async () => {
      expect(service.getFolderPath({ siteName, directoryName })).toEqual(
        `${siteName}/contents/${directoryName}`
      )
    })

    it("Retrieves the right folder path even with special characters", async () => {
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
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const encodedContent = Base64.encode(content)

    const params = {
      message: `Create file: ${fileName}`,
      content: encodedContent,
      branch: BRANCH_REF,
    }

    it("Creating a file works correctly", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockReturnValueOnce(resp)
      await expect(
        service.create(reqDetails, {
          content,
          fileName,
          directoryName,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        endpoint,
        params,
        authHeader
      )
    })

    it("Create parses and throws the correct error in case of a conflict", async () => {
      mockAxiosInstance.put.mockImplementation(() => {
        const err = new Error()
        err.response = {
          status: 422,
        }
        throw err
      })
      await expect(
        service.create(reqDetails, {
          content,
          fileName,
          directoryName,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        endpoint,
        params,
        authHeader
      )
    })
  })

  describe("Read", () => {
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const encodedContent = Base64.encode(content)
    const params = {
      ref: BRANCH_REF,
    }

    it("Reading a file works correctly", async () => {
      const resp = {
        data: {
          content: encodedContent,
          sha,
        },
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.read(reqDetails, {
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

    it("Read throws the correct error if file cannot be found", async () => {
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.read(reqDetails, {
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

  describe("ReadDirectory", () => {
    const endpoint = `${siteName}/contents/${directoryName}`
    const params = {
      ref: BRANCH_REF,
    }

    it("Reading a directory works correctly", async () => {
      const data = "test-data"
      const resp = {
        data,
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.readDirectory(reqDetails, {
          fileName,
          directoryName,
        })
      ).resolves.toEqual(data)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        validateStatus,
        params,
        headers: authHeader.headers,
      })
    })

    it("Read throws the correct error if directory cannot be found", async () => {
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.readDirectory(reqDetails, {
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

  describe("Update", () => {
    const endpoint = `${siteName}/contents/${directoryName}/${fileName}`
    const encodedContent = Base64.encode(content)
    const params = {
      message: `Update file: ${fileName}`,
      content: encodedContent,
      branch: BRANCH_REF,
      sha,
    }

    it("Updating a file works correctly", async () => {
      const resp = {
        data: {
          content: {
            sha,
          },
        },
      }
      mockAxiosInstance.put.mockReturnValueOnce(resp)
      await expect(
        service.update(reqDetails, {
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

    it("Update throws the correct error if file cannot be found", async () => {
      mockAxiosInstance.put.mockImplementation(() => {
        const err = new Error()
        err.response = {
          status: 404,
        }
        throw err
      })
      await expect(
        service.update(reqDetails, {
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

    it("Updating a file with no sha works correctly", async () => {
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
      mockAxiosInstance.get.mockReturnValueOnce(getResp)
      mockAxiosInstance.put.mockReturnValueOnce(putResp)
      await expect(
        service.update(reqDetails, {
          fileName,
          directoryName,
          fileContent: content,
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

    it("Update with no sha provided throws the correct error if file cannot be found", async () => {
      const readParams = {
        ref: BRANCH_REF,
      }
      const resp = {
        status: 404,
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.update(reqDetails, {
          fileName,
          directoryName,
          fileContent: content,
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
    const params = {
      message: `Delete file: ${fileName}`,
      branch: BRANCH_REF,
      sha,
    }

    it("Deleting a file works correctly", async () => {
      await service.delete(reqDetails, {
        fileName,
        directoryName,
        sha,
      })
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(endpoint, {
        params,
        headers: authHeader.headers,
      })
    })

    it("Deleting throws the correct error if file cannot be found", async () => {
      mockAxiosInstance.delete.mockImplementation(() => {
        const err = new Error()
        err.response = {
          status: 404,
        }
        throw err
      })
      await expect(
        service.delete(reqDetails, {
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

  describe("GetRepoState", () => {
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
    }

    it("Getting a repo state works correctly", async () => {
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
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await service.getRepoState(reqDetails)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(endpoint, {
        params,
        headers,
      })
    })
  })

  describe("GetTree", () => {
    const url = `${siteName}/git/trees/${sha}`

    const params = {
      ref: BRANCH_REF,
    }

    const headers = {
      Authorization: `token ${accessToken}`,
    }

    const tree = "test-tree"

    it("Getting a repo state works correctly", async () => {
      const resp = {
        data: {
          tree,
        },
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.getTree({ accessToken, siteName, treeSha: sha }, {})
      ).resolves.toEqual(tree)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(url, {
        params,
        headers,
      })
    })

    it("Getting the repo state recursively works correctly", async () => {
      const resp = {
        data: {
          tree,
        },
      }
      mockAxiosInstance.get.mockReturnValueOnce(resp)
      await expect(
        service.getTree(
          { accessToken, siteName, treeSha: sha },
          { isRecursive: true }
        )
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

    it("Updating a repo tree works correctly", async () => {
      const firstSha = "first-sha"
      const secondSha = "second-sha"
      const gitTree = "git-tree"
      const message = "message"
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
        .mockReturnValueOnce(firstResp)
        .mockReturnValueOnce(secondResp)
      await expect(
        service.updateTree(
          { accessToken, siteName, currentCommitSha: sha },
          { gitTree, message }
        )
      ).resolves.toEqual(secondSha)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        url,
        { tree: gitTree },
        authHeader
      )
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        commitEndpoint,
        {
          message: message || `isomerCMS updated ${siteName} state`,
          tree: firstSha,
          parents: [sha],
        },
        authHeader
      )
    })
  })

  describe("updateRepoState", () => {
    const refEndpoint = `${siteName}/git/refs/heads/${BRANCH_REF}`

    it("Updating a repo state works correctly", async () => {
      await service.updateRepoState(
        { accessToken, siteName },
        { commitSha: sha }
      )
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        refEndpoint,
        { sha, force: true },
        authHeader
      )
    })
  })
})
