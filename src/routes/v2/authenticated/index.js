import { attachSiteHandler } from "@root/middleware"
import { RouteCheckerMiddleware } from "@root/middleware/routeChecker"

import { MetricsRouter } from "./metrics"
import { NotificationsRouter } from "./notifications"

const express = require("express")

const {
  NetlifyTomlService,
} = require("@services/configServices/NetlifyTomlService")

const { CollaboratorsRouter } = require("./collaborators")
const { NetlifyTomlRouter } = require("./netlifyToml")
const { SitesRouter } = require("./sites")
const { UsersRouter } = require("./users")

const getAuthenticatedSubrouter = ({
  authenticationMiddleware,
  sitesService,
  usersService,
  apiLogger,
  statsMiddleware,
  collaboratorsService,
  authorizationMiddleware,
  reviewRouter,
  notificationsService,
  infraService,
  repoCheckerService,
}) => {
  const netlifyTomlService = new NetlifyTomlService()

  const sitesV2Router = new SitesRouter({
    sitesService,
    authorizationMiddleware,
    statsMiddleware,
    infraService,
    repoCheckerService,
  })
  const collaboratorsRouter = new CollaboratorsRouter({
    collaboratorsService,
    authorizationMiddleware,
  })
  const usersRouter = new UsersRouter({ usersService })
  const netlifyTomlV2Router = new NetlifyTomlRouter({ netlifyTomlService })
  const notificationsRouter = new NotificationsRouter({
    authorizationMiddleware,
    notificationsService,
  })
  const metricsRouter = new MetricsRouter({ authorizationMiddleware })
  const routeCheckerMiddleware = new RouteCheckerMiddleware()

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authenticationMiddleware.verifyAccess)
  // NOTE: apiLogger needs to be after `verifyJwt` as it logs the github username
  // which is only available after verifying that the jwt is valid
  authenticatedSubrouter.use(apiLogger)
  authenticatedSubrouter.use("/metrics", metricsRouter.getRouter())
  authenticatedSubrouter.use(
    "/sites/:siteName/collaborators",
    routeCheckerMiddleware.verifySiteName,
    collaboratorsRouter.getRouter()
  )
  const baseSitesV2Router = sitesV2Router.getRouter()
  const sitesRouterWithReviewRequest = baseSitesV2Router.use(
    "/:siteName/review",
    routeCheckerMiddleware.verifySiteName,
    attachSiteHandler,
    reviewRouter.getRouter()
  )
  authenticatedSubrouter.use("/sites", sitesRouterWithReviewRequest)
  authenticatedSubrouter.use(
    "/sites/:siteName/notifications",
    routeCheckerMiddleware.verifySiteName,
    notificationsRouter.getRouter()
  )
  authenticatedSubrouter.use("/user", usersRouter.getRouter())
  authenticatedSubrouter.use("/netlify-toml", netlifyTomlV2Router.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
