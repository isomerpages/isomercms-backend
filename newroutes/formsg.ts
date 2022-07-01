import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { Request, Response } from "express"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { getField } from "@utils/formsg-utils"

import { attachFormSGHandler } from "@root/newmiddleware"
import InfraService from "@services/infra/InfraService"

const { SITE_CREATE_FORM_KEY } = process.env
const REQUESTER_EMAIL_FIELD = "Government E-mail"
const SITE_NAME_FIELD = "Site Name"
const REPO_NAME_FIELD = "Repository Name"

export interface FormsgRouterProps {
  infraService: InfraService
}

export class FormsgRouter {
  private readonly infraService

  constructor({ infraService }: FormsgRouterProps) {
    this.infraService = infraService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async createSite(
    req: Request<unknown, unknown, { data: { submissionId: string } }, unknown>,
    res: Response<unknown, { submission: DecryptedContent }>
  ) {
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission
    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    const siteName = getField(responses, SITE_NAME_FIELD)
    const repoName = getField(responses, REPO_NAME_FIELD)

    if (!requesterEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      throw new BadRequestError(
        "Required 'Government E-mail' input was not found"
      )
    }

    this.infraService.createSite({
      requesterEmail,
      siteName,
      repoName,
      submissionId,
    })
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    if (!SITE_CREATE_FORM_KEY) {
      logger.error("SITE_CREATE_FORM_KEY environment variable is empty.")
      // Throw an exception instead if it is vital for this to work.
    }
    router.post(
      "/create-site",
      attachFormSGHandler(SITE_CREATE_FORM_KEY || ""),
      this.createSite
    )

    return router
  }
}
