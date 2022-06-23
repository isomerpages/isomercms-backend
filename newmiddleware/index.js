import FormSGService from "@root/services/middlewareServices/FormSGService"

import FormSGMiddleware from "./formsg"

const {
  AuthMiddlewareService,
} = require("@services/middlewareServices/AuthMiddlewareService")

const { AuthMiddleware } = require("./auth")

const getAuthMiddleware = ({ identityAuthService }) => {
  const authMiddlewareService = new AuthMiddlewareService({
    identityAuthService,
  })
  const authMiddleware = new AuthMiddleware({ authMiddlewareService })
  return authMiddleware
}

const formSGService = new FormSGService()
const formSGMiddleware = new FormSGMiddleware({ formSGService })

/**
 * Handles FormSG response authentication and decryption. 
 * 
 * To be inserted before routes requiring FormSG response data - e.g. 
 * router.post(
      "/",
      attachFormSGHandler(<formKey>),
      actualRoute
    )
 *
 * Retrieve form data from res.locals.submission.
 */
const attachFormSGHandler = (formKey) =>
  formSGMiddleware.authenticateAndDecrypt({ formKey })

module.exports = {
  getAuthMiddleware,
  attachFormSGHandler,
}
