import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"

import logger from "@logger/logger"

import InitializationError from "@errors/InitializationError"

import { getField } from "@utils/formsg-utils"

import { attachFormSGHandler } from "@root/middleware"
import { mailer } from "@root/services/utilServices/MailClient"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"

const { SITE_LAUNCH_FORM_KEY } = process.env
const REQUESTER_EMAIL_FIELD = "Government Email"
const REPO_NAME_FIELD = "Repository Name"
const PRIMARY_DOMAIN = "Primary Domain"
const REDIRECTION_DOMAIN = "Redirection Domain"
const AGENCY_EMAIL_FIELD = "Agency recipient"

export interface FormsgRouterProps {
  usersService: UsersService
  infraService: InfraService
}

export class FormsgSiteLaunchRouter {
  private readonly usersService: FormsgRouterProps["usersService"]

  private readonly infraService: FormsgRouterProps["infraService"]

  constructor({ usersService, infraService }: FormsgRouterProps) {
    this.usersService = usersService
    this.infraService = infraService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  launchSiteUsingForm: RequestHandler<
    never,
    string,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContent }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    const repoName = getField(responses, REPO_NAME_FIELD)
    const primaryDomain = getField(responses, PRIMARY_DOMAIN)
    const redirectionDomain = getField(responses, REDIRECTION_DOMAIN)
    const agencyEmail = getField(responses, AGENCY_EMAIL_FIELD)

    const subDomainSettings = [
      {
        branchName: "master",
        prefix: "",
      },
    ]

    if (redirectionDomain) {
      subDomainSettings.push({
        branchName: "master",
        prefix: "www",
      })
    }

    logger.info(
      `Launch site form submission [${submissionId}] (repoName '${repoName}', domain '${primaryDomain}') requested by <${requesterEmail}>`
    )

    // 2. Check arguments
    if (!requesterEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      return res
        .status(400)
        .send(`Required 'Government E-mail' input was not found`)
    }

    if (!agencyEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        `Error: ${"Required 'Agency E-mail' input was not found"}`
      )
      return res
        .status(400)
        .send(`Required 'Agency E-mail' input was not found`)
    }

    if (!primaryDomain) {
      const err = `A primary domain is required`
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        err,
        agencyEmail
      )
      return res.sendStatus(200)
    }
    if (!repoName) {
      const err = `A repository name is required`
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        err,
        agencyEmail
      )
      return res.sendStatus(200)
    }

    const agencyUser = await this.usersService.findByEmail(agencyEmail)
    const requesterUser = await this.usersService.findByEmail(requesterEmail)

    if (!agencyUser) {
      const err = `Form submitter ${agencyEmail} is not an Isomer user. Register an account for this user and try again.`
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        err,
        agencyEmail
      )
      return res.sendStatus(200)
    }

    if (!requesterUser) {
      const err = `Form submitter ${requesterUser} is not an Isomer user. Register an account for this user and try again.`
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        err,
        agencyEmail
      )
      return res.sendStatus(200)
    }

    // 3. Use service to Launch site
    // note: this function is not be async due to the timeout for http requests.
    const launchSite = this.infraService.launchSite(
      agencyUser,
      repoName,
      primaryDomain,
      subDomainSettings
    )

    // only send success message after promise has been resolved
    launchSite
      .then(async () => {
        await this.sendLaunchSuccess(
          requesterEmail,
          agencyEmail,
          repoName,
          submissionId
        )
      })
      .catch(async (err) => {
        await this.sendLaunchError(
          requesterEmail,
          agencyEmail,
          repoName,
          submissionId,
          `Error: ${err}`
        )
      })

    return res.sendStatus(200)
  }

  sendLaunchError = async (
    isomerEmail: string,
    repoName: string | undefined,
    submissionId: string,
    errorMessage: string,
    agencyEmail?: string
  ) => {
    const displayedRepoName = repoName || "<missing repo name>"
    const subject = `[Isomer] Launch site ${displayedRepoName} FAILURE`
    let html = `<p>Isomer site ${displayedRepoName} was <b>not</b> launched successfully. (Form submission id [${submissionId}])</p> 
<p>This email was sent from the Isomer CMS backend.</p>`
    if (agencyEmail) await mailer.sendMail(agencyEmail, subject, html)
    html += `<p>${errorMessage}</p>`
    await mailer.sendMail(isomerEmail, subject, html)
  }

  sendLaunchSuccess = async (
    requestorEmail: string,
    agencyEmail: string,
    repoName: string,
    submissionId: string
  ) => {
    const subject = `[Isomer] Launch site ${repoName} SUCCESS`
    const html = `<p>Isomer site ${repoName} was launched successfully. (Form submission id [${submissionId}])</p>
<p>You may now visit your live website. <a href="${PRIMARY_DOMAIN}">${PRIMARY_DOMAIN}</a> should be accessible within a few minutes.</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(requestorEmail, subject, html)
    await mailer.sendMail(agencyEmail, subject, html)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    if (!SITE_LAUNCH_FORM_KEY) {
      throw new InitializationError(
        "Required SITE_LAUNCH_FORM_KEY environment variable is empty."
      )
    }
    router.post(
      "/launch-site",
      attachFormSGHandler(SITE_LAUNCH_FORM_KEY),
      this.launchSiteUsingForm
    )

    return router
  }
}
