import { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import express from "express"

import { config } from "@config/config"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { BadRequestError } from "@root/errors/BadRequestError"
import InitializationError from "@root/errors/InitializationError"
import logger from "@root/logger/logger"
import SearchService from "@root/services/egazette/SearchService"
import { RequestHandler } from "@root/types"
import { getField } from "@root/utils/formsg-utils"

const EGAZETTE_FORM_KEY = config.get("formSg.eGazetteFormKey")
const REQUESTER_EMAIL_FIELD = "Government E-mail"
const SITE_NAME_FIELD = "Site Name"
const REPO_NAME_FIELD = "Repository Name"
const OWNER_NAME_FIELD = "Site Owner E-mail"
const LOGIN_TYPE_FIELD = "Login Type"

interface FormsgEGazetteRouterProps {
  searchService: SearchService
}

export class FormsgEGazetteRouter {
  private readonly searchService: FormsgEGazetteRouterProps["searchService"]

  constructor({ searchService }: FormsgEGazetteRouterProps) {
    this.searchService = searchService
  }

  formsgEGazettePublish: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    logger.info("Received egazette publish request")
    return res.sendStatus(200)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!EGAZETTE_FORM_KEY) {
      throw new InitializationError(
        "Required EGAZETTE_FORM_KEY environment variable is empty."
      )
    }
    router.post(
      "/publish-gazette",
      // attachFormSGHandler(GGS_REPAIR_FORM_KEY),
      this.formsgEGazettePublish
    )
    return router
  }
}
