import express from "express"

import { AuthMiddleware } from "@root/newmiddleware/auth"
import { SiteRouter } from "@root/newroutes/authenticatedSystem/site"
import { sitesService } from "@services/identity"

export interface GetAuthenticatedSystemSubrouterProps {
  authMiddleware: AuthMiddleware
}

const getAuthenticatedSystemSubrouter = ({
  authMiddleware,
}: GetAuthenticatedSystemSubrouterProps) => {
  const siteRouter = new SiteRouter({ sitesService })

  const authenticatedSystemSubrouter = express.Router({ mergeParams: true })

  authenticatedSystemSubrouter.use(authMiddleware.verifySystem)

  authenticatedSystemSubrouter.use("/site", siteRouter.getRouter())

  return authenticatedSystemSubrouter
}

export default getAuthenticatedSystemSubrouter
