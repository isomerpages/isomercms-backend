import InfraService from "@services/infra/InfraService"

const express = require("express")

const {
  NetlifyTomlService,
} = require("@services/configServices/NetlifyTomlService")
const { sitesService: identitySitesService } = require("@services/identity")
const { SitesService } = require("@services/utilServices/SitesService")

// TODO: Clean up the names

const { NetlifyTomlRouter } = require("./netlifyToml")
const { SitesRouter } = require("./sites")
const { UsersRouter } = require("./users")

const getAuthenticatedSubrouter = ({
  authMiddleware,
  gitHubService,
  configYmlService,
  usersService,
  reposService,
  deploymentsService,
}) => {
  const sitesService = new SitesService({ gitHubService, configYmlService })
  const netlifyTomlService = new NetlifyTomlService()

  // TODO: Evaluate if this should be moved to server.js
  const infraService = new InfraService({
    usersService,
    sitesService: identitySitesService,
    reposService,
    deploymentsService,
  })

  const sitesV2Router = new SitesRouter({ sitesService, infraService })
  const usersRouter = new UsersRouter({ usersService })
  const netlifyTomlV2Router = new NetlifyTomlRouter({ netlifyTomlService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authMiddleware.verifyJwt)

  authenticatedSubrouter.use("/sites", sitesV2Router.getRouter())
  authenticatedSubrouter.use("/user", usersRouter.getRouter())
  authenticatedSubrouter.use("/netlify-toml", netlifyTomlV2Router.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
