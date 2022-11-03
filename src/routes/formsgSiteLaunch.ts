import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"
import InitializationError from "@errors/InitializationError"

import { getField } from "@utils/formsg-utils"

import { attachFormSGHandler } from "@root/middleware"
import { mailer } from "@root/services/utilServices/MailClient"
import UsersService from "@services/identity/UsersService"
import InfraService, {
  REDIRECTION_SERVER_IP,
} from "@services/infra/InfraService"

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

  formsgLaunchSite: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContent }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission

    // todo change back these variables to const
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

    if (primaryDomain && !this.infraService.isRootDomain(primaryDomain)) {
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
      throw new BadRequestError(
        "Required 'Government E-mail' input was not found"
      )
    }

    if (!agencyEmail) {
      // Most errors are handled by sending an email to the requester, so we can't recover from this.
      throw new BadRequestError("Required 'Agency E-mail' input was not found")
    }

    try {
      if (!primaryDomain) {
        const err = `A primary domain is required`
        await this.sendLaunchError(
          [requesterEmail, agencyEmail],
          repoName,
          submissionId,
          err
        )
        return res.sendStatus(200)
      }
      if (!repoName) {
        const err = `A repository name is required`
        await this.sendLaunchError(
          [requesterEmail, agencyEmail],
          repoName,
          submissionId,
          err
        )
        return res.sendStatus(200)
      }

      const agencyUser = await this.usersService.findByEmail(agencyEmail)
      const requesterUser = await this.usersService.findByEmail(requesterEmail)

      if (!agencyUser) {
        const err = `Form submitter ${agencyEmail} is not an Isomer user. Register an account for this user and try again.`
        await this.sendLaunchError(
          [requesterEmail, agencyEmail],
          repoName,
          submissionId,
          err
        )
        return res.sendStatus(200)
      }

      if (!requesterUser) {
        const err = `Form submitter ${requesterUser} is not an Isomer user. Register an account for this user and try again.`
        await this.sendLaunchError(
          [requesterEmail, agencyEmail],
          repoName,
          submissionId,
          err
        )
        return res.sendStatus(200)
      }

      // 3. Use service to Launch site
      // note: this function is not be async due to the timeout for http requests.
      const launchSite = this.infraService.launchSite(
        submissionId,
        requesterUser,
        agencyUser,
        repoName,
        primaryDomain,
        subDomainSettings,
        redirectionDomain
      )

      // only send dns details message after promise has been resolved
      launchSite.then(async (siteLaunchDetails) => {
        let redirectionDomainTarget = REDIRECTION_SERVER_IP
        if (
          !this.infraService.isRootDomain(siteLaunchDetails.primaryDomainSource)
        ) {
          redirectionDomainTarget = siteLaunchDetails.primaryDomainTarget
        }
        await this.sendVerificationDetails(
          // fields below are guarenteed to be a string due to prior checks
          <string>requesterEmail,
          <string>repoName,
          submissionId,
          siteLaunchDetails.domainValidationSource,
          siteLaunchDetails.domainValidationTarget,
          siteLaunchDetails.primaryDomainSource,
          siteLaunchDetails.primaryDomainTarget,
          siteLaunchDetails.redirectionDomainSource,
          redirectionDomainTarget
        )
      })
    } catch (err) {
      await this.sendLaunchError(
        [requesterEmail, agencyEmail],
        repoName,
        submissionId,
        `Error: ${err}`
      )
      logger.error(err)
    }

    return res.sendStatus(200)
  }

  sendLaunchError = async (
    email: string[],
    repoName: string | undefined,
    submissionId: string,
    error: string
  ) => {
    const displayedRepoName = repoName || "<missing repo name>"
    const subject = `[Isomer] Launch site ${displayedRepoName} FAILURE`
    const html = `<p>Isomer site ${displayedRepoName} was <b>not</b> launched successfully. (Form submission id [${submissionId}])</p>
<p>${error}</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(email[0], subject, html)
  }

  sendVerificationDetails = async (
    email: string,
    repoName: string,
    submissionId: string,
    domainValidationSource: string,
    domainValidationTarget: string,
    primaryDomainSource: string,
    primaryDomainTarget: string,
    redirectionDomainSource?: string,
    redirectionDomainTarget?: string
  ) => {
    let destinationEmail = email
    // special case for moe, only send email to isomer admins
    if (this.infraService.isMOEEmail(email)) {
      destinationEmail = "admin@isomer.gov.sg"
    }

    const subject = `[Isomer] Launch site ${repoName} domain validation`
    let html = `<p>Isomer site ${repoName} is in the process of launching. (Form submission id [${submissionId}])</p>
<p>Please set the following CNAME record:</p>
<p>Source: ${domainValidationSource}</p>
<p>Target: ${domainValidationTarget}</p>
<p>Source: ${primaryDomainSource}</p>
<p>Target: ${primaryDomainTarget}</p>\n`

    if (redirectionDomainSource) {
      html += `<p>Source: ${redirectionDomainSource}</p>\n<p>Target: ${redirectionDomainTarget}</p>\n`
    }

    html += `<p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(destinationEmail, subject, html)
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
      attachFormSGHandler(SITE_LAUNCH_FORM_KEY || ""),
      this.formsgLaunchSite
    )

    return router
  }
}
