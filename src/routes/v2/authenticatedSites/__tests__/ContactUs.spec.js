const express = require("express")
const _ = require("lodash")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { contactUsContent, contactUsSha } = require("@fixtures/contactUs")

const { ContactUsRouter } = require("../contactUs")

describe("ContactUs Router", () => {
  const mockContactUsPageService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new ContactUsRouter({
    contactUsPageService: mockContactUsPageService,
  })

  const subrouter = express()
  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/contactUs",
    attachReadRouteHandlerWrapper(router.readContactUs)
  )
  subrouter.post(
    "/:siteName/contactUs",
    attachReadRouteHandlerWrapper(router.updateContactUs)
  )
  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const accessToken = undefined // Can't set request fields - will always be undefined

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readContactUs", () => {
    const expectedResponse = {
      sha: contactUsSha,
      content: contactUsContent,
    }
    mockContactUsPageService.read.mockResolvedValue(expectedResponse)

    it("retrieves contactUs details", async () => {
      const resp = await request(app).get(`/${siteName}/contactUs`).expect(200)

      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockContactUsPageService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("updateContactUs", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/contactUs`).send({}).expect(400)
    })

    it("rejects requests with incomplete body", async () => {
      // Missing layout
      const incompleteFrontMatter = _.omit(contactUsContent.frontMatter, [
        "layout",
      ])
      const reqBody = {
        content: {
          ...contactUsContent,
          frontMatter: incompleteFrontMatter,
        },
        sha: contactUsSha,
      }

      await request(app)
        .post(`/${siteName}/contactUs`)
        .send(reqBody)
        .expect(400)
    })

    it("accepts valid contactUs update requests and returns the details of the file updated", async () => {
      const reqBody = {
        content: contactUsContent,
        sha: contactUsSha,
      }
      const expectedServiceInput = {
        content: contactUsContent.pageBody,
        frontMatter: contactUsContent.frontMatter,
        sha: contactUsSha,
      }

      await request(app)
        .post(`/${siteName}/contactUs`)
        .send(reqBody)
        .expect(200)

      expect(mockContactUsPageService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("rejects contactUs update requests with additional unspecified fields", async () => {
      const extraUpdateDetails = _.cloneDeep(contactUsContent)
      // Add extra unspecified field
      extraUpdateDetails.frontMatter.extra = ""
      const reqBody = {
        content: extraUpdateDetails,
        sha: contactUsSha,
      }
      const expectedServiceInput = {
        content: extraUpdateDetails.pageBody,
        frontMatter: extraUpdateDetails.frontMatter,
        sha: contactUsSha,
      }

      await request(app)
        .post(`/${siteName}/contactUs`)
        .send(reqBody)
        .expect(400)
    })
  })
})
