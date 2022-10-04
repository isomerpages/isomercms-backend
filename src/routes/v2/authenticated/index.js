const express = require("express")

const {
  NetlifyTomlService,
} = require("@services/configServices/NetlifyTomlService")
const { SitesService } = require("@services/utilServices/SitesService")

const { CollaboratorsRouter } = require("./collaborators")
const { NetlifyTomlRouter } = require("./netlifyToml")
const { SitesRouter } = require("./sites")
const { UsersRouter } = require("./users")

const getAuthenticatedSubrouter = ({
  authenticationMiddleware,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  collaboratorsService,
  authorizationMiddleware,
}) => {
  const sitesService = new SitesService({
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
  })
  const netlifyTomlService = new NetlifyTomlService()

  const sitesV2Router = new SitesRouter({ sitesService })
  const collaboratorsRouter = new CollaboratorsRouter({
    collaboratorsService,
    authorizationMiddleware,
  })
  const usersRouter = new UsersRouter({ usersService })
  const netlifyTomlV2Router = new NetlifyTomlRouter({ netlifyTomlService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authenticationMiddleware.verifyJwt)

  authenticatedSubrouter.use(
    "/sites/:siteName/collaborators",
    collaboratorsRouter.getRouter()
  )
  authenticatedSubrouter.use("/sites", sitesV2Router.getRouter())
  authenticatedSubrouter.use("/user", usersRouter.getRouter())
  authenticatedSubrouter.use("/netlify-toml", netlifyTomlV2Router.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
