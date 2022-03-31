const express = require("express")
const request = require("supertest")

const { errorHandler } = require("@middleware/errorHandler")
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

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
  const fileName = "test-file"
  const mockSha = "12345"
  const mockContent = "mock-content"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readHomepage", () => {
    const expectedResponse = {
      sha: mockSha,
      content: mockContent,
    }

    mockHomepagePageService.read.mockResolvedValue(expectedResponse)

    it("retrieves homepage details", async () => {
      const resp = await request(app).get(`/${siteName}/homepage`).expect(200)

      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockHomepagePageService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("updateHomepage", () => {
    const updatePageDetails = {
      content: {
        frontMatter: {
          layout: "homepage",
          title: "title",
          description: "desc",
          permalink: "permalink",
          notification: "notification",
          image: "image",
          sections: [
            {
              hero: {
                title: "hero-title",
              },
            },
            {
              infobar: {
                title: "Infobar title",
                subtitle: "Subtitle",
              },
            },
          ],
        },
        pageBody: mockContent,
      },
      sha: mockSha,
    }

    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/homepage`).send({}).expect(400)
    })

    it("rejects requests with incomplete body", async () => {
      // Missing layout
      const incompleteDetails = {
        content: {
          frontMatter: {
            title: "title",
            description: "desc",
            permalink: "permalink",
            notification: "notification",
            image: "image",
            sections: [
              {
                hero: {
                  title: "hero-title",
                },
              },
              {
                infobar: {
                  title: "Infobar title",
                  subtitle: "Subtitle",
                },
              },
            ],
          },
          pageBody: mockContent,
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
