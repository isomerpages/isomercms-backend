import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"

import { config } from "@config/config"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { getField } from "@utils/formsg-utils"

import { attachFormSGHandler } from "@root/middleware"
import GitFileSystemService from "@services/db/GitFileSystemService"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"
import { mailer } from "@services/utilServices/MailClient"

const SITE_CLONE_FORM_KEY = config.get("formSg.siteCloneFormKey")
const SITE_CREATE_FORM_KEY = config.get("formSg.siteCreateFormKey")
const REQUESTER_EMAIL_FIELD = "Government E-mail"
const SITE_NAME_FIELD = "Site Name"
const REPO_NAME_FIELD = "Repository Name"
const OWNER_NAME_FIELD = "Site Owner E-mail"
const LOGIN_TYPE_FIELD = "Login Type"

export interface FormsgRouterProps {
  usersService: UsersService
  infraService: InfraService
  gitFileSystemService: GitFileSystemService
}

export class FormsgRouter {
  private readonly usersService: FormsgRouterProps["usersService"]

  private readonly infraService: FormsgRouterProps["infraService"]

  private readonly gitFileSystemService: FormsgRouterProps["gitFileSystemService"]

  constructor({
    usersService,
    infraService,
    gitFileSystemService,
  }: FormsgRouterProps) {
    this.usersService = usersService
    this.infraService = infraService
    this.gitFileSystemService = gitFileSystemService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  formsgCreateSite: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContent }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission
    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    const siteName = getField(responses, SITE_NAME_FIELD)
    const repoName = getField(responses, REPO_NAME_FIELD)
    const ownerEmail = getField(responses, OWNER_NAME_FIELD)
      ?.toLowerCase()
      .trim()
    const isEmailLogin = getField(responses, LOGIN_TYPE_FIELD) === "Email based"
    logger.info(
      `Create site form submission [${submissionId}] (repoName '${repoName}', siteName '${siteName}') requested by <${requesterEmail}>`
    )

    // 2. Check arguments
    if (!requesterEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      throw new BadRequestError(
        "Required 'Government E-mail' input was not found"
      )
    }

    try {
      if (!siteName) {
        const err = `A site name is required`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return res.sendStatus(200)
      }
      if (!repoName) {
        const err = `A repository name is required`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return res.sendStatus(200)
      }
      const foundIsomerRequester = await this.usersService.findByEmail(
        requesterEmail
      )
      if (!foundIsomerRequester) {
        const err = `Form submitter ${requesterEmail} is not an Isomer user. Register an account for this user and try again.`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return res.sendStatus(200)
      }
      let foundOwner
      if (isEmailLogin) {
        if (!ownerEmail) {
          const err = `An owner email is required for email login`
          await this.sendCreateError(
            requesterEmail,
            repoName,
            submissionId,
            err
          )
          return res.sendStatus(200)
        }
        foundOwner = await this.usersService.findOrCreateByEmail(ownerEmail)
      }
      // 3. Use service to create site
      const { deployment } = await this.infraService.createSite({
        creator: foundIsomerRequester,
        member: foundOwner,
        siteName,
        repoName,
        isEmailLogin,
      })
      await this.sendCreateSuccess(
        requesterEmail,
        repoName,
        submissionId,
        deployment.stagingUrl,
        deployment.productionUrl
      )
    } catch (err) {
      await this.sendCreateError(
        requesterEmail,
        repoName,
        submissionId,
        `Error: ${err}`
      )
      logger.error(JSON.stringify(err))
    }

    return res.sendStatus(200)
  }

  sendCreateError = async (
    email: string,
    repoName: string | undefined,
    submissionId: string,
    error: string
  ) => {
    const displayedRepoName = repoName || "<missing repo name>"
    const subject = `[Isomer] Create site ${displayedRepoName} FAILURE`
    const html = `<p>Isomer site ${displayedRepoName} was <b>not</b> created successfully. (Form submission id [${submissionId}])</p>
<p>${error}</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(email, subject, html)
  }

  sendCreateSuccess = async (
    email: string,
    repoName: string,
    submissionId: string,
    stagingUrl: string,
    productionUrl: string
  ) => {
    const subject = `[Isomer] Create site ${repoName} SUCCESS`
    const html = `<p>Isomer site ${repoName} was created successfully. (Form submission id [${submissionId}])</p>
<p>You may now view this repository on GitHub. <a href="${stagingUrl}">Staging</a> and <a href="${productionUrl}">production</a> deployments should be accessible within a few minutes.</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(email, subject, html)
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
    // NOTE: This is validated by formsg to be of domain `@open.gov.sg`;
    // hence, not revalidating here
    const requesterEmail = getField(responses, "Email") as string
    // NOTE: The field is required by our form so this cannot be empty or undefined
    const githubRepoName = getField(responses, "Github Repo Name") as string

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
      "/create-site",
      attachFormSGHandler(SITE_CREATE_FORM_KEY),
      this.formsgCreateSite
    )

    return router
  }
}
