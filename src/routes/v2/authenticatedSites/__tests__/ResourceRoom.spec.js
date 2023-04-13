const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const {
  mockUserWithSiteSessionData,
  mockGithubSessionData,
} = require("@fixtures/sessionData")

const { ResourceRoomRouter } = require("../resourceRoom")

describe("Resource Room Router", () => {
  const mockResourceRoomDirectoryService = {
    listAllResourceCategories: jest.fn(),
    getResourceRoomDirectoryName: jest.fn(),
    createResourceRoomDirectory: jest.fn(),
    renameResourceRoomDirectory: jest.fn(),
    deleteResourceRoomDirectory: jest.fn(),
  }

  const router = new ResourceRoomRouter({
    resourceRoomDirectoryService: mockResourceRoomDirectoryService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.listAllResourceCategories)
  )
  subrouter.get(
    "/:siteName/resourceRoom",
    attachReadRouteHandlerWrapper(router.getResourceRoomDirectoryName)
  )
  subrouter.post(
    "/:siteName/resourceRoom",
    attachReadRouteHandlerWrapper(router.createResourceRoomDirectory)
  )
  subrouter.post(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.renameResourceRoomDirectory)
  )
  subrouter.delete(
    "/:siteName/resourceRoom/:resourceRoomName",
    attachReadRouteHandlerWrapper(router.deleteResourceRoomDirectory)
  )

  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const resourceRoomName = "resource-room"

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
      ).toHaveBeenCalledWith(mockUserWithSiteSessionData, { resourceRoomName })
    })
  })

  describe("getResourceRoomDirectoryName", () => {
    it("returns the details of the resource room", async () => {
      mockResourceRoomDirectoryService.getResourceRoomDirectoryName.mockResolvedValueOnce(
        { resourceRoomName }
      )
      const resp = await request(app)
        .get(`/${siteName}/resourceRoom`)
        .expect(200)
      expect(resp.body).toStrictEqual({ resourceRoomName })
      expect(
        mockResourceRoomDirectoryService.getResourceRoomDirectoryName
      ).toHaveBeenCalledWith(mockUserWithSiteSessionData)
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
      ).toHaveBeenCalledWith(mockUserWithSiteSessionData, {
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
      ).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        mockGithubSessionData,
        {
          resourceRoomName,
          newDirectoryName,
        }
      )
    })
  })

  describe("deleteResourceDirectory", () => {
    it("accepts valid resource delete requests", async () => {
      await request(app)
        .delete(`/${siteName}/resourceRoom/${resourceRoomName}`)
        .expect(200)
      expect(
        mockResourceRoomDirectoryService.deleteResourceRoomDirectory
      ).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        mockGithubSessionData,
        {
          resourceRoomName,
        }
      )
    })
  })
})
