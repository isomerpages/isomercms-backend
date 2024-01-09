import express from "express"
import request from "supertest"

import { generateRouterForDefaultUserWithSite } from "@fixtures/app"
import {
  MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
  mockGithubSessionData,
} from "@root/fixtures/sessionData"
import { MOCK_REPO_NAME_ONE } from "@root/fixtures/sites"
import { attachReadRouteHandlerWrapper } from "@root/middleware/routeHandler"
import MediaDirectoryService from "@root/services/directoryServices/MediaDirectoryService"
import { MediaFileService } from "@root/services/fileServices/MdPageServices/MediaFileService"

import { MediaRouter } from "../media"

describe("Media Router", () => {
  const mockMediaDirectoryService = {
    listMediaDirectoryContent: jest.fn(),
    createMediaDirectory: jest.fn(),
    renameMediaDirectory: jest.fn(),
    deleteMediaDirectory: jest.fn(),
    moveMediaFiles: jest.fn(),
  }

  const mockMediaFileService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMultipleFiles: jest.fn(),
    rename: jest.fn(),
  }

  const router = new MediaRouter({
    mediaDirectoryService: (mockMediaDirectoryService as unknown) as MediaDirectoryService,
    mediaFileService: (mockMediaFileService as unknown) as MediaFileService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/media/:directoryName",
    attachReadRouteHandlerWrapper(router.listMediaDirectoryContents)
  )
  subrouter.post(
    "/:siteName/media",
    attachReadRouteHandlerWrapper(router.createMediaDirectory)
  )
  subrouter.delete(
    "/:siteName/media",
    attachReadRouteHandlerWrapper(router.deleteMultipleMediaFiles)
  )
  subrouter.post(
    "/:siteName/media/:directoryName",
    attachReadRouteHandlerWrapper(router.renameMediaDirectory)
  )
  subrouter.delete(
    "/:siteName/media/:directoryName",
    attachReadRouteHandlerWrapper(router.deleteMediaDirectory)
  )
  subrouter.post(
    "/:siteName/media/:directoryName/move",
    attachReadRouteHandlerWrapper(router.moveMediaFiles)
  )
  subrouter.post(
    "/:siteName/media/:directoryName/pages",
    attachReadRouteHandlerWrapper(router.createMediaFile)
  )
  subrouter.get(
    "/:siteName/media/:directoryName/pages/:fileName",
    attachReadRouteHandlerWrapper(router.readMediaFile)
  )
  subrouter.post(
    "/:siteName/media/:directoryName/pages/:fileName",
    attachReadRouteHandlerWrapper(router.updateMediaFile)
  )
  subrouter.delete(
    "/:siteName/media/:directoryName/pages/:fileName",
    attachReadRouteHandlerWrapper(router.deleteMediaFile)
  )

  const app = generateRouterForDefaultUserWithSite(subrouter)
  const siteName = MOCK_REPO_NAME_ONE
  const directoryName = "directoryName"
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listMediaDirectoryFiles", () => {
    it("returns the details of all files in a media", async () => {
      const expectedResponse = {
        directories: [
          {
            name: "directoryName",
            type: "dir",
          },
        ],
        files: [
          {
            name: "test-file",
          },
        ],
      }
      mockMediaDirectoryService.listMediaDirectoryContent.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(`/${siteName}/media/${directoryName}`)
        .query({ page: 1, limit: 15 })
        .expect(200)
      expect(resp.body).toStrictEqual([
        ...expectedResponse.directories,
        ...expectedResponse.files,
      ])
      expect(
        mockMediaDirectoryService.listMediaDirectoryContent
      ).toHaveBeenCalledWith(MOCK_USER_WITH_SITE_SESSION_DATA_ONE, {
        directoryName,
        page: "1",
        limit: "15",
        search: "",
      })
    })
  })

  describe("createMediaDirectory", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/media`).send({}).expect(400)
    })

    it("accepts valid category create requests and returns the details of the category created", async () => {
      mockMediaDirectoryService.createMediaDirectory.mockResolvedValueOnce({})
      const mediaDetails = {
        newDirectoryName: directoryName,
      }
      const resp = await request(app)
        .post(`/${siteName}/media`)
        .send(mediaDetails)
        .expect(200)
      expect(resp.body).toStrictEqual({})
      expect(
        mockMediaDirectoryService.createMediaDirectory
      ).toHaveBeenCalledWith(MOCK_USER_WITH_SITE_SESSION_DATA_ONE, undefined, {
        directoryName,
        objArray: undefined,
      })
    })
    it("accepts valid category create requests with files and returns the details of the category created", async () => {
      mockMediaDirectoryService.createMediaDirectory.mockResolvedValueOnce({})
      const mediaDetails = {
        newDirectoryName: directoryName,
        items: [
          {
            name: `fileName`,
            type: `file`,
          },
          {
            name: `fileName2`,
            type: `file`,
          },
        ],
      }
      const resp = await request(app)
        .post(`/${siteName}/media`)
        .send(mediaDetails)
        .expect(200)
      expect(resp.body).toStrictEqual({})
      expect(
        mockMediaDirectoryService.createMediaDirectory
      ).toHaveBeenCalledWith(MOCK_USER_WITH_SITE_SESSION_DATA_ONE, undefined, {
        directoryName,
        objArray: mediaDetails.items,
      })
    })
  })

  describe("renameMediaDirectory", () => {
    const newDirectoryName = "new-dir"

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid media rename requests", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}`)
        .send({ newDirectoryName })
        .expect(200)
      expect(
        mockMediaDirectoryService.renameMediaDirectory
      ).toHaveBeenCalledWith(MOCK_USER_WITH_SITE_SESSION_DATA_ONE, undefined, {
        directoryName,
        newDirectoryName,
      })
    })
  })

  describe("deleteMediaDirectory", () => {
    it("accepts valid media delete requests", async () => {
      await request(app)
        .delete(`/${siteName}/media/${directoryName}`)
        .expect(200)
      expect(
        mockMediaDirectoryService.deleteMediaDirectory
      ).toHaveBeenCalledWith(MOCK_USER_WITH_SITE_SESSION_DATA_ONE, undefined, {
        directoryName,
      })
    })
  })

  describe("moveMediaDirectoryPages", () => {
    const targetMediaCategory = "images/newDir"
    const items = [
      {
        name: "testfile",
        type: "file",
      },
      {
        name: "testfile1",
        type: "file",
      },
    ]
    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/move`)
        .send({})
        .expect(400)
    })

    it("rejects move requests for items with invalid type", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/move`)
        .send({
          target: { directoryName: targetMediaCategory },
          items: items.concat({ name: "testdir", type: "dir" }),
        })
        .expect(400)
    })

    it("rejects move requests with no specified target", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/move`)
        .send({ target: {}, items })
        .expect(400)
    })

    it("accepts valid media page move requests to another media", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/move`)
        .send({
          items,
          target: { directoryName: "images/newDir" },
        })
        .expect(200)
      expect(mockMediaDirectoryService.moveMediaFiles).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        undefined,
        {
          directoryName,
          targetDirectoryName: targetMediaCategory,
          objArray: items,
        }
      )
    })
  })

  describe("createMediaFile", () => {
    const pageDetails = {
      newFileName: fileName,
      content: mockContent,
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages`)
        .send({})
        .expect(400)
    })

    it("accepts valid media file create requests and returns the details of the file created", async () => {
      const expectedServiceInput = {
        fileName,
        directoryName,
        content: mockContent,
      }
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages`)
        .send(pageDetails)
        .expect(200)
      expect(mockMediaFileService.create).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        expectedServiceInput
      )
    })
  })

  describe("readMediaFile", () => {
    const expectedResponse = {
      sha: mockSha,
      mediaUrl: mockContent,
      name: fileName,
    }
    mockMediaFileService.read.mockResolvedValueOnce(expectedResponse)

    it("retrieves media file details", async () => {
      const expectedServiceInput = {
        fileName,
        directoryName,
      }
      const resp = await request(app)
        .get(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockMediaFileService.read).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        expectedServiceInput
      )
    })
  })

  describe("updateMediaFile", () => {
    const updatePageDetails = {
      content: mockContent,
      sha: mockSha,
    }

    const renamePageDetails = {
      ...updatePageDetails,
      newFileName: "new-file",
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid media file update requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        fileName,
        directoryName,
        content: mockContent,
        sha: mockSha,
      }
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send(updatePageDetails)
        .expect(200)
      expect(mockMediaFileService.update).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        expectedServiceInput
      )
    })

    it("accepts valid media file rename requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        directoryName,
        sha: mockSha,
      }
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send(renamePageDetails)
        .expect(200)
      expect(mockMediaFileService.rename).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        undefined,
        expectedServiceInput
      )
    })
  })

  describe("deleteMediaFile", () => {
    const pageDetails = {
      sha: mockSha,
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .delete(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid media file delete requests", async () => {
      const expectedServiceInput = {
        fileName,
        directoryName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send(pageDetails)
        .expect(200)
      expect(mockMediaFileService.delete).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        expectedServiceInput
      )
    })
  })

  describe("deleteMultipleMediaFiles", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).delete(`/${siteName}/media`).send({}).expect(400)
    })

    it("accepts valid multiple media files delete requests", async () => {
      const expectedServiceInput = {
        items: [
          {
            filePath: "test-file-one",
            sha: "test-file-one-sha",
          },
          {
            filePath: "test-file-two",
            sha: "test-file=two-sha",
          },
        ],
      }
      await request(app)
        .delete(`/${siteName}/media`)
        .send(expectedServiceInput)
        .expect(200)
      expect(mockMediaFileService.deleteMultipleFiles).toHaveBeenCalledWith(
        MOCK_USER_WITH_SITE_SESSION_DATA_ONE,
        undefined,
        expectedServiceInput
      )
    })
  })
})
