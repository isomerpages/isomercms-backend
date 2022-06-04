import express from "express"
import request from "supertest"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { generateRouter } from "@fixtures/app"
import { getAuthMiddleware } from "@root/newmiddleware"
import { RequestHandler } from "@root/types"
import { SYS_AUTH_HEADER } from "@services/middlewareServices/AuthMiddlewareService"

// Root handler for test
const hanlder: RequestHandler<never, unknown, void> = async (req, res) =>
  res.sendStatus(200)
const rootRouter = express.Router({ mergeParams: true })
rootRouter.get("/one/two", attachReadRouteHandlerWrapper(hanlder))
rootRouter.get("/", attachReadRouteHandlerWrapper(hanlder))

// Set up authentication router
const { SYSTEM_SECRET } = process.env
const authMiddleware = getAuthMiddleware({ identityAuthService: null })
const authenticatedSystemSubrouter = express.Router({ mergeParams: true })
authenticatedSystemSubrouter.use(authMiddleware.verifySystem)
authenticatedSystemSubrouter.use(rootRouter)

// Set up express with defaults and use the router under test
const subrouter = express()
subrouter.use("/", authenticatedSystemSubrouter)
const app = generateRouter(subrouter)

const mockRepositoryName = "test-repo"
const mockContact = "test-repo"
const mockUrl = "http://foo.com"

describe("System Request Authorization", () => {
  it("should return 401 when system secret header is missing", async () => {
    // Arrange
    const expected = 401

    // Act
    const actual = await request(app).get("/").send()

    // Assert
    expect(actual.statusCode).toBe(expected)
  })

  it("should return 401 when system secret header is incorrect", async () => {
    // Arrange
    const expected = 401

    // Act
    const header = {
      [SYS_AUTH_HEADER]: `not_${SYSTEM_SECRET}`,
    }
    const actual = await request(app).get("/").set(header).send()

    // Assert
    expect(actual.statusCode).toBe(expected)
  })

  it("should return 400 when correct header is present and path has <2 segments", async () => {
    // Arrange
    const expected = 400

    // Act
    const header = {
      [SYS_AUTH_HEADER]: SYSTEM_SECRET,
    }
    const actual = await request(app).get("/").set(header).send()

    // Assert
    expect(actual.statusCode).toBe(expected)
  })

  it("should return 200 when correct header is present and path has >=2 segments", async () => {
    // Arrange
    const expected = 200

    // Act
    const header = {
      [SYS_AUTH_HEADER]: SYSTEM_SECRET,
    }
    const actual = await request(app).get("/one/two").set(header).send()

    // Assert
    expect(actual.statusCode).toBe(expected)
  })
})
