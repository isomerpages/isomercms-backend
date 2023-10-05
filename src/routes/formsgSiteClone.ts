import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"

import { config } from "@config/config"

import logger from "@logger/logger"

import { getField } from "@utils/formsg-utils"

import { ISOMER_ADMIN_EMAIL } from "@root/constants"
import { attachFormSGHandler } from "@root/middleware"
import GitFileSystemService from "@services/db/GitFileSystemService"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"
import { mailer } from "@services/utilServices/MailClient"

const SITE_CLONE_FORM_KEY = config.get("formSg.siteCloneFormKey")

export interface FormsgSiteCloneRouterProps {
  usersService: UsersService
  infraService: InfraService
  gitFileSystemService: GitFileSystemService
}

export class FormsgSiteCloneRouter {
  private readonly gitFileSystemService: FormsgSiteCloneRouterProps["gitFileSystemService"]

  constructor({ gitFileSystemService }: FormsgSiteCloneRouterProps) {
    this.gitFileSystemService = gitFileSystemService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  cloneSiteToEfs: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContent }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission
    const requesterEmail = getField(responses, "Email")
    // NOTE: The field is required by our form so this cannot be empty or undefined
    const githubRepoName = getField(responses, "Github Repo Name") as string

    if (
      !requesterEmail ||
      !githubRepoName ||
      !requesterEmail.endsWith("@open.gov.sg")
    ) {
      return this.sendCloneError(
        ISOMER_ADMIN_EMAIL,
        githubRepoName,
        submissionId,
        "Invalid email or missing github repo name detected for submission"
      )
    }

    logger.info(
      `${requesterEmail} requested for ${githubRepoName} to be cloned onto EFS`
    )

    this.gitFileSystemService
      .clone(githubRepoName)
      .map((path) => {
        logger.info(`Cloned ${githubRepoName} to ${path}`)
        this.sendCloneSuccess(
          requesterEmail,
          githubRepoName,
          submissionId,
          path
        )
      })
      .mapErr((err) => {
        logger.error(
          `Cloning repo: ${githubRepoName} to EFS failed with error: ${JSON.stringify(
            err
          )}`
        )
        this.sendCloneError(
          requesterEmail,
          githubRepoName,
          submissionId,
          err.message
        )
      })
  }

  sendCloneSuccess = async (
    requesterEmail: string,
    githubRepoName: string,
    submissionId: string,
    path: string
  ) => {
    const subject = `[Isomer] Clone site ${githubRepoName} SUCCESS`
    const html = `<p>Isomer site ${githubRepoName} was cloned successfully to EFS path: ${path}. (Form submission id [${submissionId}])</p>`
    await mailer.sendMail(requesterEmail, subject, html)
  }

  async sendCloneError(
    requesterEmail: string,
    githubRepoName: string,
    submissionId: string,
    message: string
  ) {
    const subject = `[Isomer] Clone site ${githubRepoName} FAILURE`
    const html = `<p>Isomer site ${githubRepoName} was <b>not</b> cloned successfully. Cloning failed with error: ${message} (Form submission id [${submissionId}])</p>`
    await mailer.sendMail(requesterEmail, subject, html)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post(
      "/clone-site",
      attachFormSGHandler(SITE_CLONE_FORM_KEY),
      this.cloneSiteToEfs
    )

    return router
  }
}
