import { DecryptedContent } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"
import { err, ok } from "neverthrow"

import logger from "@logger/logger"

import InitializationError from "@errors/InitializationError"

import { getField, getFieldsFromTable } from "@utils/formsg-utils"

import { attachFormSGHandler } from "@root/middleware"
import { mailer } from "@root/services/utilServices/MailClient"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"

const { SITE_LAUNCH_FORM_KEY } = process.env
const REQUESTER_EMAIL_FIELD = "Government Email"
const SITE_LAUNCH_LIST =
  "Site Launch Details (Root Domain (eg. blah.moe.edu.sg), Redirection domain, Repo name (eg. moe-standrewsjc), Agency Email)"

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
  /**
   * The reason why this is a 2-d array is because of using a table in
   * formSG. eg.
   * For a submission from formSG in the table of
   * root domain | redirection | repo name
   * blah.gov.sg |    www      | ogp-blah
   * blah2.gov.sg|    www      | ogp-blah2
   *
   * will yield us the results of
   * [
   *  [blah.gov.sg, www, ogp-blah],
   *  [blah2.gov.sg, www, ogp-blah]
   * ]
   *
   */

  siteLaunchDetails?: string[] | string[][]
}

interface LaunchFailureEmailProps {
  // The fields here are optional since a misconfiguration in our
  // formSG can cause some or even all fields to be missing
  requesterEmail?: string
  repoName?: string
  primaryDomain?: string
  error: string
}

interface DnsRecordsEmailProps {
  requesterEmail: string
  repoName: string
  domainValidationSource: string
  domainValidationTarget: string
  primaryDomainSource: string
  primaryDomainTarget: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
}

export class FormsgSiteLaunchRouter {
  launchSiteFromForm = async (formResponses: FormResponsesProps) => {
    const {
      submissionId,
      requesterEmail,
      repoName,
      primaryDomain,
      redirectionDomain,
      agencyEmail,
    } = formResponses

    const subDomainSettings = [
      {
        branchName: "master",
        prefix: `${redirectionDomain ? "www" : ""}`,
      },
    ]

    logger.info(
      `Launch site form submission [${submissionId}] (repoName '${repoName}', domain '${primaryDomain}') requested by <${requesterEmail}>`
    )

    // 2. Check arguments
    if (!requesterEmail) {
      return err({
        ...formResponses,
        error: "Required 'Requester E-mail' input was not found",
      })
    }

    if (!agencyEmail) {
      return err({
        ...formResponses,
        error: "Required 'Agency E-mail' input was not found",
      })
    }

    if (!primaryDomain) {
      const error = `A primary domain is required`
      return err({ error, ...formResponses })
    }
    if (!repoName) {
      const error = `A repository name is required`
      return err({ error, ...formResponses })
    }

    const agencyUser = await this.usersService.findByEmail(agencyEmail)
    const requesterUser = await this.usersService.findByEmail(requesterEmail)

    if (!agencyUser) {
      const error = `Form submitter ${agencyEmail} is not an Isomer user. Register an account for this user and try again.`
      return err({ error, ...formResponses })
    }

    if (!requesterUser) {
      const error = `Form submitter ${requesterUser} is not an Isomer user. Register an account for this user and try again.`
      return err({ error, ...formResponses })
    }

    // 3. Use service to Launch site
    const launchSiteResult = await this.infraService.launchSite(
      requesterUser,
      agencyUser,
      repoName,
      primaryDomain,
      subDomainSettings
    )
    if (launchSiteResult.isErr()) {
      return err({
        ...formResponses,
        error: launchSiteResult.error.message,
      })
    }
    return ok({ ...launchSiteResult.value, repoName, requesterEmail })
  }

  private readonly usersService: FormsgRouterProps["usersService"]

  private readonly infraService: FormsgRouterProps["infraService"]

  constructor({ usersService, infraService }: FormsgRouterProps) {
    this.usersService = usersService
    this.infraService = infraService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  getPrimaryDomain = (url: string) =>
    url.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "")

  handleSiteLaunchFormRequest: RequestHandler<
    never,
    string,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContent }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission
    const siteLaunchList = getFieldsFromTable(responses, SITE_LAUNCH_LIST)
    const formResponses: FormResponsesProps[] =
      siteLaunchList?.map((element) =>
        // todo some sort of input validation here for table values

        /**
         *
         * For a submission from formSG in the table of
         * root domain | redirection | repo name | agency email
         * blah.gov.sg |    www      | ogp-blah  | blah@gov.sg
         * blah2.gov.sg|    www      | ogp-blah2 | blah2@gov.sg
         *
         * will yield us the results of
         * [
         *  [blah.gov.sg, www, ogp-blah, blah@gov.sg],
         *  [blah2.gov.sg, www, ogp-blah, blah2@gov.sg]
         * ]
         */

        ({
          submissionId,
          requesterEmail: getField(responses, REQUESTER_EMAIL_FIELD),
          repoName: element[2],
          primaryDomain: this.getPrimaryDomain(element[0]),
          redirectionDomain:
            element[1] === "WWW"
              ? `www.${this.getPrimaryDomain(element[0])}`
              : "",
          // if agency email not needed, use email from requester instead
          agencyEmail: element[3]
            ? element[3]
            : getField(responses, REQUESTER_EMAIL_FIELD),
        })
      ) || []

    res.sendStatus(200) // we have received the form and obtained relevant field
    this.handleSiteLaunchResults(formResponses, submissionId)
  }

  sendLaunchError = async (
    submissionId: string,
    failureResults: LaunchFailureEmailProps[]
  ) => {
    if (failureResults.length === 0) return
    const { requesterEmail } = failureResults[0]
    const email = requesterEmail || ISOMER_ADMIN_EMAIL
    const subject = `[Isomer] Launch site FAILURE`
    let html = `<p>The following sites were NOT launched successfully. (Form submission id [${submissionId}])</p>
    <table><thread><tr><th>Repo Name</th><th>Error</th></tr></thread><tbody>`

    failureResults.forEach((failureResult) => {
      const displayedRepoName = failureResult.repoName || "<missing repo name>"
      html += `
      <tr>
        <td>${displayedRepoName}</td>
        <td>${failureResult.error}</td>
      </tr>`
    })
    html += `
    </tbody></table>
    <p>This email was sent from the Isomer CMS backend.</p>`

    await mailer.sendMail(email, subject, html)
  }

  sendDNSRecords = async (
    submissionId: string,
    dnsRecordsEmailProps: DnsRecordsEmailProps[]
  ): Promise<void> => {
    if (dnsRecordsEmailProps.length === 0) return
    const { requesterEmail } = dnsRecordsEmailProps[0]
    const subject = `[Isomer] DNS records for launching websites`

    let html = `<p>Isomer sites are in the process of launching. (Form submission id [${submissionId}])</p>
    <table>
    <thead>
      <tr>
        <th>Repo Name</th>
        <th>Source</th>
        <th>Target</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>`
    dnsRecordsEmailProps.forEach((dnsRecords) => {
      // check if dnsRecords.redirectionDomain is undefined
      const hasRedirection = !!dnsRecords.redirectionDomainSource
      html += `
    <tr>
      <td>${dnsRecords.repoName}</td>
      <td>${dnsRecords.domainValidationSource}</td>
      <td>${dnsRecords.domainValidationTarget}</td>
      <td>CNAME</td>
    </tr>
    <tr>
      <td>${dnsRecords.repoName}</td>
      <td>${
        hasRedirection
          ? // if redirection, website will be hosted in the 'www' subdomain
            `www.${dnsRecords.primaryDomainSource}`
          : dnsRecords.primaryDomainSource
      }</td>
      <td>${dnsRecords.primaryDomainTarget}</td>
      <td>CNAME</td>
    </tr>`

      if (hasRedirection) {
        html += `
      <tr>
        <td>${dnsRecords.repoName}</td>
        <td>${
          // note that the source here is the primary domain source
          // since the non-www will be the one pointing to our redirection server
          dnsRecords.primaryDomainSource
        }</td>
        <td>${dnsRecords.redirectionDomainTarget}</td>
        <td>A Record</td>
      </tr>`
      }
    })
    html += `</tbody></table>
    <p>This email was sent from the Isomer CMS backend.</p>`
    await mailer.sendMail(requesterEmail, subject, html)
  }

  private async handleSiteLaunchResults(
    formResponses: FormResponsesProps[],
    submissionId: string
  ) {
    try {
      const launchResults = await Promise.all(
        formResponses.map(this.launchSiteFromForm)
      )
      const successResults: DnsRecordsEmailProps[] = []
      launchResults.forEach((launchResult) => {
        if (launchResult.isOk()) {
          successResults.push(launchResult.value)
        }
      })

      await this.sendDNSRecords(submissionId, successResults)

      const failureResults: LaunchFailureEmailProps[] = []

      launchResults.forEach((launchResult) => {
        if (launchResult.isErr() && launchResult.error) {
          failureResults.push(launchResult.error)
          return
        }
        if (launchResult.isErr()) {
          failureResults.push({
            error: "Unknown error",
          })
        }
      })

      await this.sendLaunchError(submissionId, failureResults)
    } catch (e) {
      logger.error(
        `Something unexpected went wrong when launching sites from form submission ${submissionId}. Error: ${e}`
      )
    }
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
      this.handleSiteLaunchFormRequest
    )

    return router
  }
}
