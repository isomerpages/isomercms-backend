const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")

const { CollectionPagesRouter } = require("../collectionPages")

describe("Collection Pages Router", () => {
  const mockCollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const mockSubcollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const router = new CollectionPagesRouter({
    collectionPageService: mockCollectionPageService,
    subcollectionPageService: mockSubcollectionPageService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.post(
    "/:siteName/collections/:collectionName/pages",
    attachReadRouteHandlerWrapper(router.createCollectionPage)
  )
  subrouter.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
    attachReadRouteHandlerWrapper(router.createCollectionPage)
  )
  subrouter.get(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readCollectionPage)
  )
  subrouter.get(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readCollectionPage)
  )
  subrouter.post(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateCollectionPage)
  )
  subrouter.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateCollectionPage)
  )
  subrouter.delete(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteCollectionPage)
  )
  subrouter.delete(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteCollectionPage)
  )
  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const accessToken = undefined // Can't set request fields - will always be undefined
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("createCollectionPage", () => {
    const pageDetails = {
      newFileName: "newFile",
      content: {
        pageBody: "test",
        frontMatter: {
          title: "fileTitle",
          permalink: "file/permalink",
        },
      },
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages`)
        .send({})
        .expect(400)
    })

    it("accepts valid collection page create requests and returns the details of the file created", async () => {
      const expectedServiceInput = {
        fileName: pageDetails.newFileName,
        collectionName,
        content: pageDetails.content.pageBody,
        frontMatter: pageDetails.content.frontMatter,
      }
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages`)
        .send(pageDetails)
        .expect(200)
      expect(mockCollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid subcollection page create requests and returns the details of the file created", async () => {
      const expectedServiceInput = {
        fileName: pageDetails.newFileName,
        collectionName,
        subcollectionName,
        content: pageDetails.content.pageBody,
        frontMatter: pageDetails.content.frontMatter,
      }
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockSubcollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("readCollectionPage", () => {
    const expectedResponse = {
      sha: mockSha,
      content: mockContent,
    }
    mockCollectionPageService.read.mockResolvedValue(expectedResponse)

    mockSubcollectionPageService.read.mockResolvedValue(expectedResponse)

    it("retrieves collection page details", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
      }
      const resp = await request(app)
        .get(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("retrieves subcollection page details", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
        subcollectionName,
      }
      const resp = await request(app)
        .get(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })
  })

  describe("updateCollectionPage", () => {
    const updatePageDetails = {
      content: {
        pageBody: "test",
        frontMatter: {
          title: "fileTitle",
          permalink: "file/permalink",
        },
      },
      sha: mockSha,
    }

    const renamePageDetails = {
      ...updatePageDetails,
      newFileName: "new-file",
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid collection page update requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        fileName,
        collectionName,
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send(updatePageDetails)
        .expect(200)
      expect(mockCollectionPageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid collection page rename requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        collectionName,
        content: renamePageDetails.content.pageBody,
        frontMatter: renamePageDetails.content.frontMatter,
        sha: renamePageDetails.sha,
      }
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send(renamePageDetails)
        .expect(200)
      expect(mockCollectionPageService.rename).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid subcollection page update requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        fileName,
        collectionName,
        subcollectionName,
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .send(updatePageDetails)
        .expect(200)
      expect(mockSubcollectionPageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid subcollection page rename requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        collectionName,
        subcollectionName,
        content: renamePageDetails.content.pageBody,
        frontMatter: renamePageDetails.content.frontMatter,
        sha: renamePageDetails.sha,
      }
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .send(renamePageDetails)
        .expect(200)
      expect(mockSubcollectionPageService.rename).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("deleteCollectionPage", () => {
    const pageDetails = {
      sha: mockSha,
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .delete(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid collection page delete requests", async () => {
      const expectedServiceInput = {
        fileName,
        collectionName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send(pageDetails)
        .expect(200)
      expect(mockCollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid subcollection page delete requests", async () => {
      const expectedServiceInput = {
        fileName,
        collectionName,
        subcollectionName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockSubcollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })
})
