const express = require("express")

const {
  NetlifyTomlService,
} = require("@services/configServices/NetlifyTomlService")
const { SitesService } = require("@services/utilServices/SitesService")

const { NetlifyTomlRouter } = require("./netlifyToml")
const { SitesRouter } = require("./sites")
const { UsersRouter } = require("./users")

const getAuthenticatedSubrouter = ({
  authenticationMiddleware,
  gitHubService,
  configYmlService,
  usersService,
  apiLogger,
  isomerAdminsService,
}) => {
  const sitesService = new SitesService({
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
  })
  const netlifyTomlService = new NetlifyTomlService()

  const sitesV2Router = new SitesRouter({ sitesService })
  const usersRouter = new UsersRouter({ usersService })
  const netlifyTomlV2Router = new NetlifyTomlRouter({ netlifyTomlService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authenticationMiddleware.verifyJwt)
  // NOTE: apiLogger needs to be after `verifyJwt` as it logs the github username
  // which is only available after verifying that the jwt is valid
  authenticatedSubrouter.use(apiLogger)

  authenticatedSubrouter.use("/sites", sitesV2Router.getRouter())
  authenticatedSubrouter.use("/user", usersRouter.getRouter())
  authenticatedSubrouter.use("/netlify-toml", netlifyTomlV2Router.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
