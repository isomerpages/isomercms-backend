const express = require("express")
const _ = require("lodash")
const request = require("supertest")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { generateRouter } = require("@fixtures/app")
const { navigationContent, navigationSha } = require("@fixtures/navigation")

const { NavigationRouter } = require("../navigation")

describe("Navigation Router", () => {
  const mockNavigationYmlService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const router = new NavigationRouter({
    navigationYmlService: mockNavigationYmlService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/navigation",
    attachReadRouteHandlerWrapper(router.readNavigation)
  )
  subrouter.post(
    "/:siteName/navigation",
    attachReadRouteHandlerWrapper(router.updateNavigation)
  )
  const app = generateRouter(subrouter)

  const siteName = "test-site"
  const accessToken = undefined // Can't set request fields - will always be undefined

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("readNavigation", () => {
    const expectedResponse = {
      sha: navigationSha,
      content: navigationContent,
    }
    mockNavigationYmlService.read.mockResolvedValue(expectedResponse)

    it("retrieves navigation details", async () => {
      const resp = await request(app).get(`/${siteName}/navigation`).expect(200)

      expect(resp.body).toStrictEqual(expectedResponse)
      expect(mockNavigationYmlService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("updateNavigation", () => {
    it("rejects requests with invalid body", async () => {
      await request(app).post(`/${siteName}/navigation`).send({}).expect(400)
    })

    it("rejects requests with incomplete body", async () => {
      const reqBody = {
        content: navigationContent,
      }

      await request(app)
        .post(`/${siteName}/navigation`)
        .send(reqBody)
        .expect(400)
    })

    it("rejects requests with incorrect body", async () => {
      // Multiple types of menu types
      const incorrectDetails = _.cloneDeep(navigationContent)
      incorrectDetails.links[0].resource_room = true
      const reqBody = {
        content: incorrectDetails,
        sha: navigationSha,
      }

      await request(app)
        .post(`/${siteName}/navigation`)
        .send(reqBody)
        .expect(400)
    })

    it("accepts valid navigation update requests and returns the details of the file updated", async () => {
      const reqBody = {
        content: navigationContent,
        sha: navigationSha,
      }
      const expectedServiceInput = {
        fileContent: navigationContent,
        sha: navigationSha,
      }

      await request(app)
        .post(`/${siteName}/navigation`)
        .send(reqBody)
        .expect(200)

      expect(mockNavigationYmlService.update).toHaveBeenCalledWith(
        reqDetails,
        expectedServiceInput
      )
    })

    it("rejects navigation update requests with additional unspecified fields", async () => {
      const extraUpdateDetails = _.cloneDeep(navigationContent)
      // Add extra unspecified field
      extraUpdateDetails.extra = ""
      const reqBody = {
        content: extraUpdateDetails,
        sha: navigationSha,
      }

      await request(app)
        .post(`/${siteName}/navigation`)
        .send(reqBody)
        .expect(400)
    })
  })
})
