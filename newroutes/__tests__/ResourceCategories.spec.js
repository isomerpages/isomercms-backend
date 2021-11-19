const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { ResourceCategoriesRouter } = require("../resourceCategories")

describe("Resource Categories Router", () => {
  const mockResourceDirectoryService = {
    listAllResourceCategories: jest.fn(),
    listFiles: jest.fn(),
    createResourceDirectory: jest.fn(),
    renameResourceDirectory: jest.fn(),
    deleteResourceDirectory: jest.fn(),
    moveResourcePages: jest.fn(),
  }

  const router = new ResourceCategoriesRouter({
    resourceDirectoryService: mockResourceDirectoryService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
    attachReadRouteHandlerWrapper(router.listResourceDirectoryFiles)
  )
  app.post(
    "/:siteName/resourceRoom/:resourceRoomName/resources",
    attachReadRouteHandlerWrapper(router.createResourceDirectory)
  )
  app.post(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
    attachReadRouteHandlerWrapper(router.renameResourceDirectory)
  )
  app.delete(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
    attachReadRouteHandlerWrapper(router.deleteResourceDirectory)
  )
  app.post(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory/move",
    attachReadRouteHandlerWrapper(router.moveResourceDirectoryPages)
  )

  app.use(errorHandler)

  const siteName = "test-site"
  const resourceRoomName = "resource-room"
  const resourceCategory = "resource-category"

  // Can't set request fields - will always be undefined
  const accessToken = undefined
  const currentCommitSha = undefined
  const treeSha = undefined

  const reqDetails = { siteName, accessToken }
  const additionalReqDetails = { ...reqDetails, currentCommitSha, treeSha }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listResourceDirectoryFiles", () => {
    it("returns the details of all files in a resource", async () => {
      const expectedResponse = [
        {
          name: "testfile",
          type: "file",
        },
        {
          name: "testfile1",
          type: "file",
        },
        {
          name: "testfile2",
          type: "file",
        },
      ]
      mockResourceDirectoryService.listFiles.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}`
        )
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(
        mockResourceDirectoryService.listFiles
      ).toHaveBeenCalledWith(reqDetails, { resourceRoomName, resourceCategory })
    })
  })

  describe("createResourceDirectory", () => {
    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/resourceRoom/${resourceRoomName}/resources`)
        .send({})
        .expect(400)
    })

    it("accepts valid category create requests and returns the details of the category created", async () => {
      mockResourceDirectoryService.createResourceDirectory.mockResolvedValueOnce(
        {}
      )
      const resourceDetails = {
        newDirectoryName: resourceCategory,
      }
      const resp = await request(app)
        .post(`/${siteName}/resourceRoom/${resourceRoomName}/resources`)
        .send(resourceDetails)
        .expect(200)
      expect(resp.body).toStrictEqual({})
      expect(
        mockResourceDirectoryService.createResourceDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
        resourceCategory,
      })
    })
  })

  describe("renameResourceDirectory", () => {
    const newDirectoryName = "new-dir"

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}`
        )
        .send({})
        .expect(400)
    })

    it("accepts valid resource rename requests", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}`
        )
        .send({ newDirectoryName })
        .expect(200)
      expect(
        mockResourceDirectoryService.renameResourceDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
        resourceCategory,
        newDirectoryName,
      })
    })
  })

  describe("deleteResourceDirectory", () => {
    it("accepts valid resource delete requests", async () => {
      await request(app)
        .delete(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}`
        )
        .expect(200)
      expect(
        mockResourceDirectoryService.deleteResourceDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
        resourceCategory,
      })
    })
  })

  describe("moveResourceDirectoryPages", () => {
    const targetResourceCategory = "resource"
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
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}/move`
        )
        .send({})
        .expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}/move`
        )
        .send({
          target: { resourceCategory: targetResourceCategory },
          items: items.concat({ name: "testdir", type: "dir" }),
        })
        .expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}/move`
        )
        .send({ target: {}, items })
        .expect(400)
    })

    it("accepts valid resource page move requests to another resource", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategory}/move`
        )
        .send({ items, target: { resourceCategory: targetResourceCategory } })
        .expect(200)
      expect(
        mockResourceDirectoryService.moveResourcePages
      ).toHaveBeenCalledWith(reqDetails, {
        resourceRoomName,
        resourceCategory,
        targetResourceCategory,
        objArray: items,
      })
    })
  })
})
