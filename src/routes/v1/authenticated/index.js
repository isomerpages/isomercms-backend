const express = require("express")

const sitesRouter = require("@routes/v1/authenticated/sites")
const { UsersRouter } = require("@routes/v2/authenticated/users")

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
