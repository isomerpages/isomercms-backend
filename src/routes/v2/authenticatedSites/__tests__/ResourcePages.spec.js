const express = require("express")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { mockUserWithSiteSessionData } = require("@fixtures/sessionData")

const { ResourcePagesRouter } = require("../resourcePages")

describe("Resource Pages Router", () => {
  const mockResourcePageService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const router = new ResourcePagesRouter({
    resourcePageService: mockResourcePageService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.post(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages",
    attachReadRouteHandlerWrapper(router.createResourcePage)
  )
  subrouter.get(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.readResourcePage)
  )
  subrouter.post(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.updateResourcePage)
  )
  subrouter.delete(
    "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
    attachReadRouteHandlerWrapper(router.deleteResourcePage)
  )
  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const resourceRoomName = "resource-room"
  const resourceCategoryName = "resource-category"
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("createResourcePage", () => {
    const pageDetails = {
      newFileName: "newFile",
      content: {
        pageBody: "test",
        frontMatter: {
          title: "fileTitle",
          date: "2021-10-13",
          permalink: "file/permalink",
        },
      },
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages`
        )
        .send({})
        .expect(400)
    })

    it("accepts valid resource page create requests and returns the details of the file created", async () => {
      const expectedServiceInput = {
        fileName: pageDetails.newFileName,
        resourceRoomName,
        resourceCategoryName,
        content: pageDetails.content.pageBody,
        frontMatter: pageDetails.content.frontMatter,
      }
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockResourcePageService.create).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        expectedServiceInput
      )
    })
  })

  describe("readResourcePage", () => {
    const expectedResponse = {
      sha: mockSha,
      content: mockContent,
    }
    mockResourcePageService.read.mockResolvedValue(expectedResponse)
    it("retrieves resource page details", async () => {
      const expectedServiceInput = {
        fileName,
        resourceRoomName,
        resourceCategoryName,
      }
      const resp = await request(app)
        .get(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .expect(200)
      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockResourcePageService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        expectedServiceInput
      )
    })
  })

  describe("updateResourcePage", () => {
    const updatePageDetails = {
      content: {
        pageBody: "test",
        frontMatter: {
          title: "fileTitle",
          permalink: "file/permalink",
          date: "2021-10-13",
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
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .send({})
        .expect(400)
    })

    it("accepts valid resource page update requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        fileName,
        resourceRoomName,
        resourceCategoryName,
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .send(updatePageDetails)
        .expect(200)
      expect(mockResourcePageService.update).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        expectedServiceInput
      )
    })

    it("accepts valid resource page rename requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        oldFileName: fileName,
        newFileName: renamePageDetails.newFileName,
        resourceRoomName,
        resourceCategoryName,
        content: renamePageDetails.content.pageBody,
        frontMatter: renamePageDetails.content.frontMatter,
        sha: renamePageDetails.sha,
      }
      await request(app)
        .post(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .send(renamePageDetails)
        .expect(200)
      expect(mockResourcePageService.rename).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        expectedServiceInput
      )
    })
  })

  describe("deleteResourcePage", () => {
    const pageDetails = {
      sha: mockSha,
    }

    it("rejects requests with invalid body", async () => {
      await request(app)
        .delete(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .send({})
        .expect(400)
    })

    it("accepts valid resource page delete requests", async () => {
      const expectedServiceInput = {
        fileName,
        resourceRoomName,
        resourceCategoryName,
        sha: pageDetails.sha,
      }
      await request(app)
        .delete(
          `/${siteName}/resourceRoom/${resourceRoomName}/resources/${resourceCategoryName}/pages/${fileName}`
        )
        .send(pageDetails)
        .expect(200)
      expect(mockResourcePageService.delete).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        expectedServiceInput
      )
    })
  })
})
