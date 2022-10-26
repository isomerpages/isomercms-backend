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

const ISOMER_ADMIN_EMAIL = "admin@isomer.gov.sg"

interface FormResponsesProps {
  submissionId: string
  requesterEmail?: string
  repoName?: string
  primaryDomain?: string
  redirectionDomain?: string
  agencyEmail?: string
}
export class FormsgSiteLaunchRouter {
  siteLaunch = async (formResponses: FormResponsesProps): Promise<void> => {
    const {
      submissionId,
      requesterEmail,
      repoName,
      primaryDomain,
      redirectionDomain,
      agencyEmail,
    } = formResponses

    res.sendStatus(200) // we have received the form and obtained relevant fields

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
      await this.sendLaunchError(
        ISOMER_ADMIN_EMAIL,
        repoName,
        submissionId,
        `Error: ${"Required 'Agency E-mail' input was not found"}`
      )
      return
    }

    if (!agencyEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        `Error: ${"Required 'Agency E-mail' input was not found"}`
      )
      return
    }

    if (!primaryDomain) {
      const err = `A primary domain is required`
      await this.sendLaunchError(requesterEmail, repoName, submissionId, err)
      return
    }
    if (!repoName) {
      const err = `A repository name is required`
      await this.sendLaunchError(requesterEmail, repoName, submissionId, err)
      return
    }

    const agencyUser = await this.usersService.findByEmail(agencyEmail)
    const requesterUser = await this.usersService.findByEmail(requesterEmail)

    if (!agencyUser) {
      const err = `Form submitter ${agencyEmail} is not an Isomer user. Register an account for this user and try again.`
      await this.sendLaunchError(requesterEmail, repoName, submissionId, err)
      return
    }

    if (!requesterUser) {
      const err = `Form submitter ${requesterUser} is not an Isomer user. Register an account for this user and try again.`
      await this.sendLaunchError(requesterEmail, repoName, submissionId, err)
      return
    }

    // 3. Use service to Launch site
    // note: this function is not be async due to the timeout for http requests.
    const launchSite = await this.infraService.launchSite(
      requesterUser,
      agencyUser,
      repoName,
      primaryDomain,
      subDomainSettings
    )

    if (launchSite.isOk()) {
      await this.sendVerificationDetails(requesterEmail, repoName, submissionId, 
        primaryDomain, launchSite.value.primaryDomainTarget)
    } else {
      await this.sendLaunchError(
        requesterEmail,
        repoName,
        submissionId,
        `Error: ${launchSite.error}`
      )
    }
  }

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
    const formResponses: FormResponsesProps = {
      submissionId,
      requesterEmail: getField(responses, REQUESTER_EMAIL_FIELD),
      repoName: getField(responses, REPO_NAME_FIELD),
      primaryDomain: getField(responses, PRIMARY_DOMAIN),
      redirectionDomain: getField(responses, REDIRECTION_DOMAIN),
      agencyEmail: getField(responses, AGENCY_EMAIL_FIELD),
    }
    res.sendStatus(200) // we have received the form and obtained relevant field
    this.siteLaunch(formResponses)
  }

  sendLaunchError = async (
    isomerEmail: string,
    repoName: string | undefined,
    submissionId: string,
    errorMessage: string
  ) => {
    const displayedRepoName = repoName || "<missing repo name>"
    const subject = `[Isomer] Launch site ${displayedRepoName} FAILURE`
    const html = `<p>Isomer site ${displayedRepoName} was <b>not</b> launched successfully. (Form submission id [${submissionId}])</p> 
<p>${errorMessage}</p>
<p>This email was sent from the Isomer CMS backend.</p>`

    await mailer.sendMail(isomerEmail, subject, html)
  }

  sendVerificationDetails = async (
    requestorEmail: string,
    repoName: string,
    submissionId: string
  ): Promise<void> => {
    const subject = `[Isomer] Launch site ${repoName} SUCCESS`
    const html = `<p>Isomer site ${repoName} was launched successfully. (Form submission id [${submissionId}])</p>
<p>You may now visit your live website. <a href="${PRIMARY_DOMAIN}">${PRIMARY_DOMAIN}</a> should be accessible within a few minutes.</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(requestorEmail, subject, html)
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
