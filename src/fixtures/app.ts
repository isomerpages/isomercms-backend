import cookieParser from "cookie-parser"
import express, { Express } from "express"
import _ from "lodash"

import { errorHandler } from "@middleware/errorHandler"

import GithubSessionData from "@classes/GithubSessionData"
import UserSessionData from "@classes/UserSessionData"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { RequestHandler } from "@root/types"

import {
  mockUserSessionData,
  mockUserWithSiteSessionData,
  mockGithubSessionData,
  MOCK_USER_SESSION_DATA_ONE,
} from "./sessionData"
import { MOCK_REPO_NAME_ONE } from "./sites"

/**
 * @deprecated
 */
const attachSessionData: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  {
    userSessionData: UserSessionData
    userWithSiteSessionData: UserWithSiteSessionData
    githubSessionData: GithubSessionData
  }
> = (req, res, next) => {
  res.locals.userSessionData = mockUserSessionData
  res.locals.userWithSiteSessionData = mockUserWithSiteSessionData
  res.locals.githubSessionData = mockGithubSessionData
  next()
}

const attachUserSessionData: (
  userSessionData: UserSessionData
) => RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  { userSessionData: UserSessionData }
> = (userSessionData) => (req, res, next) => {
  res.locals.userSessionData = userSessionData
  next()
}

const attachUserSessionDataWithSite: (
  userSessionData: UserSessionData,
  siteName: string
) => RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  {
    userSessionData: UserSessionData
    userWithSiteSessionData: UserWithSiteSessionData
  }
> = (userSessionData, siteName) => (req, res, next) => {
  const userWithSiteSessionData = new UserWithSiteSessionData({
    isomerUserId: userSessionData.isomerUserId,
    email: userSessionData.email,
    siteName,
  })
  res.locals.userSessionData = userSessionData
  res.locals.userWithSiteSessionData = userWithSiteSessionData
  next()
}

const attachDefaultUserSessionData: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  { userSessionData: UserSessionData }
> = attachUserSessionData(MOCK_USER_SESSION_DATA_ONE)

const attachDefaultUserSessionDataWithSite: RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  {
    userSessionData: UserSessionData
    userWithSiteSessionData: UserWithSiteSessionData
  }
> = attachUserSessionDataWithSite(
  MOCK_USER_SESSION_DATA_ONE,
  MOCK_REPO_NAME_ONE
)

/**
 * @deprecated
 */
export const generateRouter = (router: Express) => {
  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(attachSessionData)
  app.use(router)
  app.use(errorHandler)
  return app
}

const generateFinalRouter = (router: Express) => {
  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(router)
  app.use(errorHandler)
  return app
}

export const generateRouterForUser = (
  router: Express,
  userSessionData: UserSessionData
) => {
  const app = express()
  app.use(attachUserSessionData(userSessionData))
  app.use(router)
  return generateFinalRouter(app)
}

export const generateRouterForUserWithSite = (
  router: Express,
  userSessionData: UserSessionData,
  siteName: string
) => {
  const app = express()
  app.use(attachUserSessionDataWithSite(userSessionData, siteName))
  app.use(router)
  return generateFinalRouter(app)
}

export const generateRouterForDefaultUser = (router: Express) => {
  const app = express()
  app.use(attachDefaultUserSessionData)
  app.use(router)
  return generateFinalRouter(app)
}

export const generateRouterForDefaultUserWithSite = (router: Express) => {
  const app = express()
  app.use(attachDefaultUserSessionDataWithSite)
  app.use(router)
  return generateFinalRouter(app)
}
