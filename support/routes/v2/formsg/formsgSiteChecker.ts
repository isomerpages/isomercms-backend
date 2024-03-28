/* eslint-disable import/prefer-default-export */
import {
  DecryptedContentAndAttachments,
  DecryptedFile,
} from "@opengovsg/formsg-sdk/dist/types"
import express, { RequestHandler } from "express"

import { config } from "@config/config"

import InitializationError from "@root/errors/InitializationError"
import logger from "@root/logger/logger"
import { attachFormSGHandler } from "@root/middleware"
import RepoCheckerService from "@root/services/review/RepoCheckerService"
import { getField, getId } from "@root/utils/formsg-utils"

interface FormsgSiteCheckerRouterProps {
  repoCheckerService: RepoCheckerService
}

const SITE_CHECKER_FORM_KEY = config.get("formSg.siteCheckerFormKey")

const REQUESTER_EMAIL_FIELD = "Email"

const OPTION_TO_SUBMIT_CSV = "Do you want to run this on all sites?"

const ATTACHMENT = "Attachment"

export class FormsgSiteCheckerRouter {
  private readonly repoCheckerService: FormsgSiteCheckerRouterProps["repoCheckerService"]

  constructor({ repoCheckerService }: FormsgSiteCheckerRouterProps) {
    this.repoCheckerService = repoCheckerService
  }

  getSiteLinkCheckerHandler: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    const { responses } = res.locals.submission.content

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    if (!requesterEmail?.endsWith("@open.gov.sg")) {
      logger.error("Requester email is not from @open.gov.sg")
      return
    }

    const optionToSubmitCsv = getField(responses, OPTION_TO_SUBMIT_CSV)

    const repoNames: string[] = []

    if (optionToSubmitCsv === "Yes") {
      this.repoCheckerService.runCheckerForAllRepos()
      return
    }

    const attachmentId = getId(responses, ATTACHMENT)
    if (!attachmentId) {
      throw new Error("No attachment id")
    }
    const decryptedFile: DecryptedFile =
      res.locals.submission.attachments?.[attachmentId]
    const reposCsv = Buffer.from(decryptedFile.content).toString()
    if (!reposCsv.startsWith("repo_name")) {
      logger.error("Invalid csv format")
      return
    }
    const repos = reposCsv.split("\n").slice(1)
    repos.forEach((repo) => {
      repoNames.push(repo)
    })
    if (repoNames.length === 0) {
      logger.error("No repo name provided")
      return
    }

    this.repoCheckerService.runCheckerForRepos(repoNames)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!SITE_CHECKER_FORM_KEY) {
      throw new InitializationError(
        "Required SITE_CHECKER_FORM_KEY environment variable is empty."
      )
    }
    router.post(
      "/site-link-checker",
      attachFormSGHandler(SITE_CHECKER_FORM_KEY),
      this.getSiteLinkCheckerHandler
    )

    return router
  }
}
