const path = require("path")

const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { CollectionPagesRouter } = require("../collectionPages")

describe("Collection Pages Router", () => {
  const mockController = {
    CreatePage: jest.fn(),
    ReadPage: jest.fn(),
    UpdatePage: jest.fn(),
    DeletePage: jest.fn(),
  }

  const router = new CollectionPagesRouter({
    collectionController: mockController,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.post(
    "/:siteName/collections/:collectionName/pages",
    attachReadRouteHandlerWrapper(router.createCollectionPage)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
    attachReadRouteHandlerWrapper(router.createCollectionPage)
  )
  app.get(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readCollectionPage)
  )
  app.get(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readCollectionPage)
  )
  app.post(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateCollectionPage)
  )
  app.post(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateCollectionPage)
  )
  app.delete(
    "/:siteName/collections/:collectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteCollectionPage)
  )
  app.delete(
    "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteCollectionPage)
  )
  app.use(errorHandler)

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
      const expectedControllerInput = {
        fileName: pageDetails.newFileName,
        collectionName,
        content: pageDetails.content.pageBody,
        frontMatter: pageDetails.content.frontMatter,
      }
      await request(app)
        .post(`/${siteName}/collections/${collectionName}/pages`)
        .send(pageDetails)
        .expect(200)
      expect(mockController.CreatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("accepts valid third nav page create requests and returns the details of the file created", async () => {
      const expectedControllerInput = {
        fileName: pageDetails.newFileName,
        collectionName,
        thirdNavTitle: subcollectionName,
        content: pageDetails.content.pageBody,
        frontMatter: pageDetails.content.frontMatter,
      }
      await request(app)
        .post(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockController.CreatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })
  })

  describe("readCollectionPage", () => {
    mockController.ReadPage.mockReturnValue({
      sha: mockSha,
      content: mockContent,
    })

    it("retrieves collection page details", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
      }
      await request(app)
        .get(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .expect(200)
      expect(mockController.ReadPage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("retrieves third nav page details", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
        thirdNavTitle: subcollectionName,
      }
      await request(app)
        .get(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .expect(200)
      expect(mockController.ReadPage).toHaveBeenCalledWith(
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
      const expectedControllerInput = {
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
      expect(mockController.UpdatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("accepts valid collection page rename requests and returns the details of the file updated", async () => {
      const expectedControllerInput = {
        fileName,
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
      expect(mockController.UpdatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("accepts valid third nav page update requests and returns the details of the file updated", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
        thirdNavTitle: subcollectionName,
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
      expect(mockController.UpdatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("accepts valid third nav page rename requests and returns the details of the file updated", async () => {
      const expectedControllerInput = {
        fileName,
        newFileName: renamePageDetails.newFileName,
        collectionName,
        thirdNavTitle: subcollectionName,
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
      expect(mockController.UpdatePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
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
      const expectedControllerInput = {
        fileName,
        collectionName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(`/${siteName}/collections/${collectionName}/pages/${fileName}`)
        .send(pageDetails)
        .expect(200)
      expect(mockController.DeletePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })

    it("accepts valid third nav page delete requests", async () => {
      const expectedControllerInput = {
        fileName,
        collectionName,
        thirdNavTitle: subcollectionName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(
          `/${siteName}/collections/${collectionName}/subcollections/${subcollectionName}/pages/${fileName}`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockController.DeletePage).toHaveBeenCalledWith(
        reqDetails,
        expectedControllerInput
      )
    })
  })
})
