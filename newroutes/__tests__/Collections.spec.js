const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { CollectionsRouter } = require("../collections")

describe("Collections Router", () => {
  const mockCollectionDirectoryService = {
    listAllCollections: jest.fn(),
    listFiles: jest.fn(),
    createDirectory: jest.fn(),
    renameDirectory: jest.fn(),
    deleteDirectory: jest.fn(),
    reorderDirectory: jest.fn(),
    movePages: jest.fn(),
  }

  const mockSubcollectionDirectoryService = {
    listFiles: jest.fn(),
    createDirectory: jest.fn(),
    renameDirectory: jest.fn(),
    deleteDirectory: jest.fn(),
    reorderDirectory: jest.fn(),
    movePages: jest.fn(),
  }

  const router = new CollectionsRouter({
    collectionDirectoryService: mockCollectionDirectoryService,
    subcollectionDirectoryService: mockSubcollectionDirectoryService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/collections",
    attachReadRouteHandlerWrapper(router.listAllCollections)
  )
  app.get(
    "/:siteName/collections/:collectionName",
    attachReadRouteHandlerWrapper(router.listCollectionDirectoryFiles)
  )
  app.get(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName",
    attachReadRouteHandlerWrapper(router.listCollectionDirectoryFiles)
  )
  app.post(
    "/:siteName/collections",
    attachReadRouteHandlerWrapper(router.createCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections",
    attachReadRouteHandlerWrapper(router.createCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName",
    attachReadRouteHandlerWrapper(router.renameCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName",
    attachReadRouteHandlerWrapper(router.renameCollectionDirectory)
  )
  app.delete(
    "/:siteName/collections/:collectionName",
    attachReadRouteHandlerWrapper(router.deleteCollectionDirectory)
  )
  app.delete(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName",
    attachReadRouteHandlerWrapper(router.deleteCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName/reorder",
    attachReadRouteHandlerWrapper(router.reorderCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/reorder",
    attachReadRouteHandlerWrapper(router.reorderCollectionDirectory)
  )
  app.post(
    "/:siteName/collections/:collectionName/move",
    attachReadRouteHandlerWrapper(router.moveCollectionDirectoryPages)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/move",
    attachReadRouteHandlerWrapper(router.moveCollectionDirectoryPages)
  )

  app.use(errorHandler)

  const siteName = "test-site"
  const collectionName = "collection"
  const subcollectionName = "subcollection"

  // Can't set request fields - will always be undefined
  const accessToken = undefined
  const currentCommitSha = undefined
  const treeSha = undefined

  const reqDetails = { siteName, accessToken }
  const additionalReqDetails = { ...reqDetails, currentCommitSha, treeSha }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listAllCollections", () => {
    it("lists the set of all collections", async () => {
      const expectedResponse = [
        {
          name: "test-col",
          type: "dir",
        },
        {
          name: "test-col2",
          type: "dir",
        },
      ]
      mockCollectionDirectoryService.listAllCollections.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(`/${siteName}/collections`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(
        mockCollectionDirectoryService.listAllCollections
      ).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("listCollectionDirectoryFiles", () => {
    it("returns the details of all files in a collection", async () => {
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
          name: "testsub",
          type: "dir",
          children: ["file1", "file2"],
        },
        {
          name: "testfile2",
          type: "file",
        },
      ]
      mockCollectionDirectoryService.listFiles.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(`/${siteName}/collections/${collectionName}`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(
        mockCollectionDirectoryService.listFiles
      ).toHaveBeenCalledWith(reqDetails, { collectionName })
    })
    it("returns all files in a subcollection", async () => {
      const expectedResponse = [
        {
          name: "testfile",
          type: "file",
        },
        {
          name: "testfile1",
          type: "file",
        },
      ]
      mockSubcollectionDirectoryService.listFiles.mockResolvedValueOnce(
        expectedResponse
      )
      const resp = await request(app)
        .get(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}`
        )
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(
        mockSubcollectionDirectoryService.listFiles
      ).toHaveBeenCalledWith(reqDetails, { collectionName, subcollectionName })
    })
  })

  describe("createCollectionDirectory", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/collections`).send({}).expect(400)
    })

    it("accepts valid collection create requests with no specified files and returns the details of the collection created", async () => {
      mockCollectionDirectoryService.createDirectory.mockResolvedValueOnce([])
      const collectionDetails = {
        newDirectoryName: collectionName,
      }
      const resp = await request(app)
        .post(`/${siteName}/collections`)
        .send(collectionDetails)
        .expect(200)
      expect(resp.body).toStrictEqual([])
      expect(
        mockCollectionDirectoryService.createDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        objArray: undefined,
      })
    })

    it("accepts valid collection create requests with specified files and returns the details of the collection created", async () => {
      const collectionDetails = {
        newDirectoryName: collectionName,
        items: [
          {
            name: "testfile",
            type: "file",
          },
          {
            name: "testfile1",
            type: "file",
          },
        ],
      }
      mockCollectionDirectoryService.createDirectory.mockResolvedValueOnce(
        collectionDetails.items
      )
      const resp = await request(app)
        .post(`/${siteName}/collections`)
        .send(collectionDetails)
        .expect(200)
      expect(resp.body).toStrictEqual(collectionDetails.items)
      expect(
        mockCollectionDirectoryService.createDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        objArray: collectionDetails.items,
      })
    })

    it("accepts valid subcollection create requests with no specified files and returns the details of the subcollection created", async () => {
      mockSubcollectionDirectoryService.createDirectory.mockResolvedValueOnce(
        []
      )
      const collectionDetails = {
        newDirectoryName: subcollectionName,
      }
      const resp = await request(app)
        .post(`/${siteName}/collections/${collectionName}/subcollections`)
        .send(collectionDetails)
        .expect(200)
      expect(resp.body).toStrictEqual([])
      expect(
        mockSubcollectionDirectoryService.createDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subcollectionName,
        objArray: undefined,
      })
    })

    it("accepts valid collection create requests with specified files and returns the details of the collection created", async () => {
      const collectionDetails = {
        newDirectoryName: subcollectionName,
        items: [
          {
            name: "testfile",
            type: "file",
          },
          {
            name: "testfile1",
            type: "file",
          },
        ],
      }
      mockSubcollectionDirectoryService.createDirectory.mockResolvedValueOnce(
        collectionDetails.items
      )
      const resp = await request(app)
        .post(`/${siteName}/collections/${collectionName}/subcollections`)
        .send(collectionDetails)
        .expect(200)
      expect(resp.body).toStrictEqual(collectionDetails.items)
      expect(
        mockSubcollectionDirectoryService.createDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subcollectionName,
        objArray: collectionDetails.items,
      })
    })
  })

  describe("renameCollectionDirectory", () => {
    const newDirectoryName = "new-dir"

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid collection rename requests", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}`)
        .send({ newDirectoryName })
        .expect(200)
      expect(
        mockCollectionDirectoryService.renameDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        newDirectoryName,
      })
    })

    it("accepts valid subcollection rename requests", async () => {
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}`
        )
        .send({ newDirectoryName })
        .expect(200)
      expect(
        mockSubcollectionDirectoryService.renameDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subcollectionName,
        newDirectoryName,
      })
    })
  })

  describe("deleteCollectionDirectory", () => {
    it("accepts valid collection delete requests", async () => {
      await request(app)
        .delete(`/${siteName}/collections/${collectionName}`)
        .expect(200)
      expect(
        mockCollectionDirectoryService.deleteDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
      })
    })

    it("accepts valid subcollection delete requests", async () => {
      await request(app)
        .delete(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}`
        )
        .expect(200)
      expect(
        mockSubcollectionDirectoryService.deleteDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subcollectionName,
      })
    })
  })

  describe("reorderCollectionDirectory", () => {
    const reorderDetails = {
      items: [
        {
          name: "testfile",
          type: "file",
        },
        {
          name: "testfile1",
          type: "file",
        },
      ],
    }
    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/reorder`)
        .send({})
        .expect(400)
    })

    it("accepts valid collection reorder requests", async () => {
      mockCollectionDirectoryService.reorderDirectory.mockResolvedValueOnce(
        reorderDetails.items
      )
      const resp = await request(app)
        .post(`/${siteName}/collections/${collectionName}/reorder`)
        .send(reorderDetails)
        .expect(200)
      expect(resp.body).toStrictEqual(reorderDetails.items)
      expect(
        mockCollectionDirectoryService.reorderDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        objArray: reorderDetails.items,
      })
    })

    it("accepts valid subcollection reorder requests", async () => {
      mockSubcollectionDirectoryService.reorderDirectory.mockResolvedValueOnce(
        reorderDetails.items
      )
      const resp = await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/reorder`
        )
        .send(reorderDetails)
        .expect(200)
      expect(resp.body).toStrictEqual(reorderDetails.items)
      expect(
        mockSubcollectionDirectoryService.reorderDirectory
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subcollectionName,
        objArray: reorderDetails.items,
      })
    })
  })

  describe("moveCollectionDirectoryPages", () => {
    const targetCollectionName = "collection"
    const targetSubcollectionName = "subcollection"
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
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({})
        .expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({
          target: {},
          items: items.concat({ name: "testdir", type: "dir" }),
        })
        .expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({ items })
        .expect(400)
    })

    it("accepts valid collection page move requests to unlinked pages", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({ items, target: {} })
        .expect(200)
      expect(mockCollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid collection page move requests to another collection", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({ items, target: { collectionName: targetCollectionName } })
        .expect(200)
      expect(mockCollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          targetCollectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid collection page move requests to a subcollection", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/move`)
        .send({
          items,
          target: {
            collectionName: targetCollectionName,
            subCollectionName: targetSubcollectionName,
          },
        })
        .expect(200)
      expect(mockCollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          targetCollectionName,
          targetSubcollectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid subcollection page move requests to unlinked pages", async () => {
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/move`
        )
        .send({ items, target: {} })
        .expect(200)
      expect(mockSubcollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          subcollectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid subcollection page move requests to a collection", async () => {
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/move`
        )
        .send({ items, target: { collectionName: targetCollectionName } })
        .expect(200)
      expect(mockSubcollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          subcollectionName,
          targetCollectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid subcollection page move requests to another subcollection", async () => {
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/move`
        )
        .send({
          items,
          target: {
            collectionName: targetCollectionName,
            subCollectionName: targetSubcollectionName,
          },
        })
        .expect(200)
      expect(mockSubcollectionDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          subcollectionName,
          targetCollectionName,
          targetSubcollectionName,
          objArray: items,
        }
      )
    })
  })
})
