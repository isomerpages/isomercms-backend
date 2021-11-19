const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { ResourceRoomRouter } = require("../resourceRoom")

describe("Resource Room Router", () => {
  const mockResourceRoomDirectoryService = {
    listAllResourceCategories: jest.fn(),
    getResourceRoomDirectory: jest.fn(),
    createResourceRoomDirectory: jest.fn(),
    renameResourceRoomDirectory: jest.fn(),
    deleteResourceRoomDirectory: jest.fn(),
  }

  const router = new ResourceRoomRouter({
    resourceRoomDirectoryService: mockResourceRoomDirectoryService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.listAllResourceCategories)
  )
  app.get(
    "/:siteName/resourceRoom",
    attachReadRouteHandlerWrapper(router.getResourceRoomDirectory)
  )
  app.post(
    "/:siteName/resourceRoom",
    attachReadRouteHandlerWrapper(router.createResourceRoomDirectory)
  )
  app.post(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.renameResourceRoomDirectory)
  )
  app.delete(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.deleteResourceRoomDirectory)
  )

  app.use(errorHandler)

  const siteName = "test-site"
  const resourceRoomName = "resource-room"

  // Can't set request fields - will always be undefined
  const accessToken = undefined
  const currentCommitSha = undefined
  const treeSha = undefined

  const reqDetails = { siteName, accessToken }
  const additionalReqDetails = { ...reqDetails, currentCommitSha, treeSha }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listAllResourceCategories", () => {
    it("lists the set of all resource categories", async () => {
      const expectedResponse = [
        {
          name: "test-cat",
          type: "dir",
        },
        {
          name: "test-cate2",
          type: "dir",
        },
      ]
      mockResourceRoomDirectoryService.listAllResourceCategories.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(`/${siteName}/resourceRoom/${resourceRoomName}`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(
        mockResourceRoomDirectoryService.listAllResourceCategories
      ).toHaveBeenCalledWith(reqDetails, { resourceRoomName })
    })
  })

  describe("getResourceRoomDirectory", () => {
    it("returns the details of the resource room", async () => {
      mockResourceRoomDirectoryService.getResourceRoomDirectory.mockResolvedValueOnce(
        { resourceRoomName }
      )
      const resp = await request(app)
        .get(`/${siteName}/resourceRoom`)
        .expect(200)
      expect(resp.body).toStrictEqual({ resourceRoomName })
      expect(
        mockResourceRoomDirectoryService.getResourceRoomDirectory
      ).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("createResourceRoomDirectory", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/resourceRoom`).send({}).expect(400)
    })

    it("accepts valid category create requests and returns the details of the category created", async () => {
      mockResourceRoomDirectoryService.createResourceRoomDirectory.mockResolvedValueOnce(
        {}
      )
      const resourceDetails = {
        newDirectoryName: resourceRoomName,
      }
      const resp = await request(app)
        .post(`/${siteName}/resourceRoom`)
        .send(resourceDetails)
        .expect(200)
      expect(resp.body).toStrictEqual({})
      expect(
        mockResourceRoomDirectoryService.createResourceRoomDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
      })
    })
  })

  describe("renameResourceDirectory", () => {
    const newDirectoryName = "new-dir"

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/resourceRoom/${resourceRoomName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid resource rename requests", async () => {
      await request(app)
        .post(`/${siteName}/resourceRoom/${resourceRoomName}`)
        .send({ newDirectoryName })
        .expect(200)
      expect(
        mockResourceRoomDirectoryService.renameResourceRoomDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
        newDirectoryName,
      })
    })
  })

  describe("deleteResourceDirectory", () => {
    it("accepts valid resource delete requests", async () => {
      await request(app)
        .delete(`/${siteName}/resourceRoom/${resourceRoomName}`)
        .expect(200)
      expect(
        mockResourceRoomDirectoryService.deleteResourceRoomDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
      })
    })
  })
})
