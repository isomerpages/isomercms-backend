const express = require("express")

const { SitesService } = require("@services/utilServices/SitesService")

const { SitesRouter } = require("./sites")
const { UsersRouter } = require("./users")

const getAuthenticatedSubrouter = ({
  authMiddleware,
  gitHubService,
  configYmlService,
  usersService,
}) => {
  const sitesService = new SitesService({ gitHubService, configYmlService })

  const sitesV2Router = new SitesRouter({ sitesService })
  const usersRouter = new UsersRouter({ usersService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authMiddleware.verifyJwt)

  authenticatedSubrouter.use("/sites", sitesV2Router.getRouter())
  authenticatedSubrouter.use("/user", usersRouter.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
