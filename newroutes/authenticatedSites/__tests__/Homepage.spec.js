const express = require("express")
const _ = require("lodash")
const request = require("supertest")

const { NotFoundError } = require("@errors/NotFoundError")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { homepageContent } = require("@fixtures/homepage")

const { HomepageRouter } = require("../homepage")

describe("Homepage Router", () => {
  const mockHomepagePageService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new HomepageRouter({
    homepagePageService: mockHomepagePageService,
  })

  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))

  // We can use read route handler here because we don't need to lock the repo
  app.get(
    "/:siteName/homepage",
    attachReadRouteHandlerWrapper(router.readHomepage)
  )
  app.post(
    "/:siteName/homepage",
    attachReadRouteHandlerWrapper(router.updateHomepage)
  )
  app.use(errorHandler)

  const siteName = "test-site"
  const accessToken = undefined // Can't set request fields - will always be undefined
  const mockSha = "12345"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readHomepage", () => {
    const expectedResponse = {
      sha: mockSha,
      content: homepageContent,
    }

    it("retrieves homepage details", async () => {
      mockHomepagePageService.read.mockResolvedValueOnce(expectedResponse)
      const resp = await request(app).get(`/${siteName}/homepage`).expect(200)

      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockHomepagePageService.read).toHaveBeenCalledWith(reqDetails)
    })

    it("returns appropriate failure on read failure", async () => {
      mockHomepagePageService.read.mockRejectedValueOnce(
        new NotFoundError("not here")
      )
      await request(app).get(`/${siteName}/homepage`).expect(404)

      expect(mockHomepagePageService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("updateHomepage", () => {
    const updatePageDetails = {
      content: homepageContent,
      sha: mockSha,
    }

    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/homepage`).send({}).expect(400)
    })

    it("rejects requests with incomplete body", async () => {
      // Missing layout
      const incompleteFrontMatter = _.omit(homepageContent.frontMatter, [
        "layout",
      ])
      const incompleteDetails = {
        content: {
          frontMatter: incompleteFrontMatter,
          pageBody: homepageContent,
        },
        sha: mockSha,
      }

      await request(app)
        .post(`/${siteName}/homepage`)
        .send(incompleteDetails)
        .expect(400)
    })

    it("accepts valid homepage update requests and returns the details of the file updated", async () => {
      const expectedServiceInput = {
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }

      await request(app)
        .post(`/${siteName}/homepage`)
        .send(updatePageDetails)
        .expect(200)

      expect(mockHomepagePageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("accepts valid homepage update requests with additional unspecified fields and returns the details of the file updated", async () => {
      const extraUpdateDetails = { ...updatePageDetails }
      // Add extra unspecified field
      extraUpdateDetails.content.frontMatter.extra = ""
      const expectedServiceInput = {
        content: updatePageDetails.content.pageBody,
        frontMatter: updatePageDetails.content.frontMatter,
        sha: updatePageDetails.sha,
      }

      await request(app)
        .post(`/${siteName}/homepage`)
        .send(extraUpdateDetails)
        .expect(200)

      expect(mockHomepagePageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })
  })
})
