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
  removeSiteFromSessionData,
} from "./sessionData"

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

const attachUserWithSiteSessionData: (
  userWithSiteSessionData: UserWithSiteSessionData
) => RequestHandler<
  unknown,
  unknown,
  unknown,
  unknown,
  {
    userSessionData: UserSessionData
    userWithSiteSessionData: UserWithSiteSessionData
  }
> = (userWithSiteSessionData) => (req, res, next) => {
  const userSessionData = removeSiteFromSessionData(userWithSiteSessionData)
  res.locals.userSessionData = userSessionData
  res.locals.userWithSiteSessionData = userWithSiteSessionData
  next()
}

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
  router.use(attachUserSessionData(userSessionData))
  return generateFinalRouter(router)
}

export const generateRouterForUserWithSite = (
  router: Express,
  userWithSiteSessionData: UserWithSiteSessionData
) => {
  router.use(attachUserWithSiteSessionData(userWithSiteSessionData))
  return generateFinalRouter(router)
}
