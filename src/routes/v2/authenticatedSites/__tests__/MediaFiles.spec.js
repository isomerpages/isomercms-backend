const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")

const { MediaFilesRouter } = require("../mediaFiles")

describe("Media Files Router", () => {
  const mockMediaFileService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const router = new MediaFilesRouter({
    mediaFileService: mockMediaFileService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
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
  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const directoryName = "imageDir"
  const accessToken = undefined // Can't set request fields - will always be undefined
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
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
        reqDetails,
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
        reqDetails,
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
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid media file rename requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        directoryName,
        content: mockContent,
        sha: mockSha,
      }
      await request(app)
        .post(`/${siteName}/media/${directoryName}/pages/${fileName}`)
        .send(renamePageDetails)
        .expect(200)
      expect(mockMediaFileService.rename).toHaveBeenCalledWith(
        reqDetails,
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
        reqDetails,
        expectedServiceInput
      )
    })
  })
})
