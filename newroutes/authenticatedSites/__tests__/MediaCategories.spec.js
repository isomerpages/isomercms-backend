const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")

const { MediaCategoriesRouter } = require("../mediaCategories")

describe("Media Categories Router", () => {
  const mockMediaDirectoryService = {
    listFiles: jest.fn(),
    createMediaDirectory: jest.fn(),
    renameMediaDirectory: jest.fn(),
    deleteMediaDirectory: jest.fn(),
    moveMediaFiles: jest.fn(),
  }

  const router = new MediaCategoriesRouter({
    mediaDirectoryService: mockMediaDirectoryService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/media/:directoryName",
    attachReadRouteHandlerWrapper(router.listMediaDirectoryFiles)
  )
  subrouter.post(
    "/:siteName/media",
    attachReadRouteHandlerWrapper(router.createMediaDirectory)
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

  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const directoryName = "imageDir"

  // Can't set request fields - will always be undefined
  const accessToken = undefined
  const currentCommitSha = undefined
  const treeSha = undefined

  const reqDetails = { siteName, accessToken }
  const additionalReqDetails = { ...reqDetails, currentCommitSha, treeSha }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listMediaDirectoryFiles", () => {
    it("returns the details of all files in a media", async () => {
      const expectedResponse = [
        {
          sha: "mockSha",
          mediaUrl: "mockContent",
          name: "fileName",
        },
        {
          sha: "mockSha1",
          mediaUrl: "mockContent1",
          name: "fileName1",
        },
        {
          sha: "mockSha2",
          mediaUrl: "mockContent2",
          name: "fileName2",
        },
      ]
      mockMediaDirectoryService.listFiles.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(`/${siteName}/media/${directoryName}`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockMediaDirectoryService.listFiles).toHaveBeenCalledWith(
        reqDetails,
        {
          directoryName,
        }
      )
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
      ).toHaveBeenCalledWith(reqDetails, {
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
      ).toHaveBeenCalledWith(reqDetails, {
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
      ).toHaveBeenCalledWith(reqDetails, {
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
      ).toHaveBeenCalledWith(additionalReqDetails, {
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
        reqDetails,
        {
          directoryName,
          targetDirectoryName: targetMediaCategory,
          objArray: items,
        }
      )
    })
  })
})
