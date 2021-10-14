const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { UnlinkedPagesRouter } = require("../unlinkedPages")

describe("Unlinked Pages Router", () => {
  const mockService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const mockUnlinkedPagesDirectoryService = {
    listAllUnlinkedPages: jest.fn(),
    movePages: jest.fn(),
  }

  const router = new UnlinkedPagesRouter({
    unlinkedPageService: mockService,
    unlinkedPagesDirectoryService: mockUnlinkedPagesDirectoryService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/pages",
    attachReadRouteHandlerWrapper(router.listAllUnlinkedPages)
  )
  app.post(
    "/:siteName/pages/pages",
    attachReadRouteHandlerWrapper(router.createUnlinkedPage)
  )
  app.get(
    "/:siteName/pages/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readUnlinkedPage)
  )
  app.post(
    "/:siteName/pages/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateUnlinkedPage)
  )
  app.delete(
    "/:siteName/pages/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteUnlinkedPage)
  )
  app.post(
    "/:siteName/pages/move",
    attachReadRouteHandlerWrapper(router.moveUnlinkedPages)
  )
  app.use(errorHandler)

  const siteName = "test-site"
  const accessToken = undefined // Can't set request fields - will always be undefined
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("listAllUnlinkedPages", () => {
    const listPageResp = [
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

    it("returns the list of unlinked pages", async () => {
      mockUnlinkedPagesDirectoryService.listAllUnlinkedPages.mockResolvedValueOnce(
        listPageResp
      )
      const resp = await request(app).get(`/${siteName}/pages`).expect(200)
      expect(resp.body).toStrictEqual(listPageResp)
      expect(
        mockUnlinkedPagesDirectoryService.listAllUnlinkedPages
      ).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("createUnlinkedPage", () => {
    const createPageDetails = {
      newFileName: "newFile",
      content: {
        pageBody: "test",
        frontMatter: {
          title: "fileTitle",
          permalink: "file/permalink",
        },
      },
    }

    it("rejects create requests with invalid body", async () => {
      await request(app).post(`/${siteName}/pages/pages`).send({}).expect(400)
    })

    it("accepts valid unlinked page creation requests and returns the details of the file created", async () => {
      const expectedServiceInput = {
        fileName: createPageDetails.newFileName,
        content: createPageDetails.content.pageBody,
        frontMatter: createPageDetails.content.frontMatter,
      }
      await request(app)
        .post(`/${siteName}/pages/pages`)
        .send(createPageDetails)
        .expect(200)
      expect(mockService.create).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("readUnlinkedPage", () => {
    mockService.read.mockResolvedValue({
      sha: mockSha,
      content: mockContent,
    })

    it("retrieves unlinked page details", async () => {
      const expectedServiceInput = {
        fileName,
      }
      await request(app).get(`/${siteName}/pages/pages/${fileName}`).expect(200)
      expect(mockService.read).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("updateUnlinkedPage", () => {
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

    it("rejects update requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/pages/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid unlinked page update requests and returns the details of the updated file", async () => {
      const expectedServiceInput = {
        fileName,
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }
      await request(app)
        .post(`/${siteName}/pages/pages/${fileName}`)
        .send(updatePageDetails)
        .expect(200)
      expect(mockService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid unlinked page rename requests and returns the details of the renamed file", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        content: renamePageDetails.content.pageBody,
        frontMatter: renamePageDetails.content.frontMatter,
        sha: renamePageDetails.sha,
      }
      await request(app)
        .post(`/${siteName}/pages/pages/${fileName}`)
        .send(renamePageDetails)
        .expect(200)
      expect(mockService.rename).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("deleteUnlinkedPage", () => {
    const deletePageDetails = {
      sha: mockSha,
    }

    it("rejects delete requests with invalid body", async () => {
      await request(app)
        .delete(`/${siteName}/pages/pages/${fileName}`)
        .send({})
        .expect(400)
    })

    it("accepts valid unlinked page delete requests", async () => {
      const expectedServiceInput = {
        fileName,
        sha: deletePageDetails.sha,
      }
      await request(app)
        .delete(`/${siteName}/pages/pages/${fileName}`)
        .send(deletePageDetails)
        .expect(200)
      expect(mockService.delete).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })

  describe("moveUnlinkedPages", () => {
    const collectionName = "collection"
    const subCollectionName = "subcollection"
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
    const expectedRequestInput = {
      target: {
        collectionName,
      },
      items,
    }
    it("rejects move requests with invalid body", async () => {
      await request(app).post(`/${siteName}/pages/move`).send({}).expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/pages/move`)
        .send({
          ...expectedRequestInput,
          items: items.concat({ name: "testdir", type: "dir" }),
        })
        .expect(400)
    })

    it("rejects move requests with invalid body", async () => {
      await request(app)
        .post(`/${siteName}/pages/move`)
        .send({ items })
        .expect(400)
    })

    it("accepts valid unlinked page move requests to collections", async () => {
      await request(app)
        .post(`/${siteName}/pages/move`)
        .send(expectedRequestInput)
        .expect(200)
      expect(mockUnlinkedPagesDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          targetCollectionName: collectionName,
          objArray: items,
        }
      )
    })

    it("accepts valid unlinked page move requests to subcollections", async () => {
      await request(app)
        .post(`/${siteName}/pages/move`)
        .send({
          ...expectedRequestInput,
          target: { collectionName, subCollectionName },
        })
        .expect(200)
      expect(mockUnlinkedPagesDirectoryService.movePages).toHaveBeenCalledWith(
        reqDetails,
        {
          targetCollectionName: collectionName,
          targetSubcollectionName: subCollectionName,
          objArray: items,
        }
      )
    })
  })
})
