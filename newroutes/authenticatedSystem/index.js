import { ContactUsRouter } from "@root/newroutes/authenticatedSites/contactUs"

const express = require("express")

const { SiteRouter } = require("@root/newroutes/authenticatedSystem/site")

const getAuthenticatedSystemSubrouter = ({ authMiddleware }) => {
  const siteRouter = new SiteRouter({ authMiddleware })

  const authenticatedSystemSubrouter = express.Router({ mergeParams: true })

  authenticatedSystemSubrouter.use(authMiddleware.verifySystem)

  authenticatedSystemSubrouter.use("/site", siteRouter.getRouter())

  return authenticatedSystemSubrouter
}

export default getAuthenticatedSystemSubrouter
