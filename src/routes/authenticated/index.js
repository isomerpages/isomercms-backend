const express = require("express")

const sitesRouter = require("@root/routes/authenticated/sites")

const { UsersRouter } = require("../../newroutes/authenticated/users")

const getAuthenticatedSubrouter = ({ authMiddleware, usersService }) => {
  // Workaround - no v1 users router exists
  const usersRouter = new UsersRouter({ usersService })

  const authenticatedSubrouter = express.Router({ mergeParams: true })

  authenticatedSubrouter.use(authMiddleware.verifyJwt)

  authenticatedSubrouter.use("/sites", sitesRouter)
  authenticatedSubrouter.use("/user", usersRouter.getRouter())

  return authenticatedSubrouter
}

export default getAuthenticatedSubrouter
