import FormSG from "@opengovsg/formsg-sdk"
import express, {
  NextFunction,
  Request,
  Response,
  RequestHandler,
} from "express"

import AuthService from "@services/identity/AuthService"
import { AuthMiddlewareService } from "@services/middlewareServices/AuthMiddlewareService"
import FormsProcessingService from "@services/middlewareServices/FormsProcessingService"

import { AuthMiddleware } from "./auth"

const getAuthMiddleware = ({
  identityAuthService,
}: {
  identityAuthService: AuthService
}) => {
  const authMiddlewareService = new AuthMiddlewareService({
    identityAuthService,
  })
  const authMiddleware = new AuthMiddleware({ authMiddlewareService })
  return authMiddleware
}

const formsg = FormSG()
const formSGService = new FormsProcessingService({ formsg })

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
const attachFormSGHandler = (formKey: string): RequestHandler[] => [
  formSGService.authenticate(),
  express.json(),
  formSGService.decrypt({ formKey }),
]

const attachSiteHandler = (req: Request, res: Response, next: NextFunction) => {
  const {
    params: { siteName },
  } = req
  const { sessionData } = res.locals
  sessionData.addSiteName(siteName)
  return next()
}

export { getAuthMiddleware, attachFormSGHandler, attachSiteHandler }
