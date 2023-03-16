const express = require("express")

const sitesRouter = require("@routes/v1/authenticated/sites")
const { UsersRouter } = require("@routes/v2/authenticated/users")

const getAuthenticatedSubrouter = ({
  authMiddleware,
  usersService,
  apiLogger,
}) => {
  // Workaround - no v1 users router exists
  const usersRouter = new UsersRouter({ usersService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authMiddleware.verifyJwt)
  // NOTE: apiLogger needs to be after `verifyJwt` as it logs the github username
  // which is only available after verifying that the jwt is valid
  authenticatedSubrouter.use(apiLogger)
  authenticatedSubrouter.use("/sites", sitesRouter)
  authenticatedSubrouter.use("/user", usersRouter.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
