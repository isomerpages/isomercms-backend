import { CaaRecord } from "node:dns"
import dnsPromises from "node:dns/promises"

import { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"
import { err, ok } from "neverthrow"

import { config } from "@config/config"

import logger from "@logger/logger"

import InitializationError from "@errors/InitializationError"

import { getField, getFieldsFromTable } from "@utils/formsg-utils"

import { ISOMER_SUPPORT_EMAIL } from "@root/constants"
import { attachFormSGHandler } from "@root/middleware"
import { mailer } from "@root/services/utilServices/MailClient"
import {
  DigDNSRecord,
  DnsRecordsEmailProps,
  LaunchFailureEmailProps,
  getDNSRecordsEmailBody,
  getErrorEmailBody,
} from "@root/services/utilServices/SendDNSRecordEmailClient"
import TRUSTED_AMPLIFY_CAA_RECORDS from "@root/types/caaAmplify"
import { SiteLaunchResult } from "@root/types/siteLaunch"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"

const SITE_LAUNCH_FORM_KEY = config.get("formSg.siteLaunchFormKey")
const REQUESTER_EMAIL_FIELD = "Government Email"
const SITE_LAUNCH_LIST =
  "Site Launch Details (Root Domain (eg. blah.moe.edu.sg), Redirection domain, Repo name (eg. moe-standrewsjc), Agency Email)"

export interface FormsgSiteLaunchRouterProps {
  usersService: UsersService
  infraService: InfraService
}

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

  private readonly usersService: FormsgSiteLaunchRouterProps["usersService"]

  private readonly infraService: FormsgSiteLaunchRouterProps["infraService"]

  constructor({ usersService, infraService }: FormsgSiteLaunchRouterProps) {
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
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    // 1. Extract arguments
    const { submissionId } = req.body.data
    const { responses } = res.locals.submission.content
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
    const email = requesterEmail || ISOMER_SUPPORT_EMAIL
    const subject = `[Isomer] Launch site FAILURE`
    const html = getErrorEmailBody(submissionId, failureResults)
    await mailer.sendMail(email, subject, html)
  }

  sendDNSRecords = async (
    submissionId: string,
    dnsRecordsEmailProps: DnsRecordsEmailProps[]
  ): Promise<void> => {
    if (dnsRecordsEmailProps.length === 0) return
    const { requesterEmail } = dnsRecordsEmailProps[0]
    const subject = `[Isomer] DNS records for launching websites`
    const html = getDNSRecordsEmailBody(submissionId, dnsRecordsEmailProps)
    await mailer.sendMail(requesterEmail, subject, html)
  }

  digAAAADomainRecords = async (
    launchResult: SiteLaunchResult
  ): Promise<DigDNSRecord[]> => {
    try {
      // check for AAAA records
      const quadADigResponses = await dnsPromises.resolve6(
        launchResult.primaryDomainSource
      )

      if (quadADigResponses.length <= 0) {
        return []
      }
      return quadADigResponses.map((record) => ({
        domain: launchResult.primaryDomainSource,
        type: "AAAA",
        value: record,
      }))
    } catch (e: any) {
      if (e.code && e.code === "ENODATA") {
        logger.info(
          `Unable to get dig response for domain: ${launchResult.primaryDomainSource}. Skipping check for AAAA records`
        )
      }
      throw e
    }
  }

  digCAADomainRecords = async (
    launchResult: SiteLaunchResult
  ): Promise<{
    addAWSACMCertCAA: boolean
    addLetsEncryptCAA: boolean
  }> => {
    try {
      const caaDigResponses: CaaRecord[] = await dnsPromises.resolveCaa(
        launchResult.primaryDomainSource
      )

      if (caaDigResponses.length > 0) {
        const caaRecords = caaDigResponses

        /**
         * NOTE: If there exists more than one CAA Record, we need to
         * 1. check if they have whitelisted Amazon CAA && letsencrypt.org CAA (if using redir)
         * 2. if not, send email to inform them to whitelist Amazon CAA and letsencrypt.org CAA (if using redir)
         */
        const hasAmazonCAAWhitelisted = caaRecords.some((record) => {
          const isAmazonCAA = TRUSTED_AMPLIFY_CAA_RECORDS.some(
            (trustedCAA) =>
              trustedCAA === record.issue || trustedCAA === record.issuewild
          )
          return isAmazonCAA
        })

        const isUsingRedirectionService = !!launchResult.redirectionDomainSource

        const needsLetsEncryptCAAWhitelisted =
          isUsingRedirectionService &&
          !caaRecords.some((record) => {
            const isLetsEncryptCAA =
              record.issue === "letsencrypt.org" ||
              record.issuewild === "letsencrypt.org"
            return isLetsEncryptCAA
          })

        const result = {
          addAWSACMCertCAA: !hasAmazonCAAWhitelisted,
          addLetsEncryptCAA: needsLetsEncryptCAAWhitelisted,
        }

        return result
      }
      return {
        addAWSACMCertCAA: false,
        addLetsEncryptCAA: false,
      }
    } catch (e: any) {
      if (e.code && e.code === "ENODATA") {
        logger.info(
          `Unable to get dig response for domain: ${launchResult.primaryDomainSource}. Skipping check for CAA records`
        )
      }
      throw e
    }
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
      for (const launchResult of launchResults) {
        if (launchResult.isOk()) {
          const successResult: DnsRecordsEmailProps = launchResult.value

          successResult.quadARecords = await this.digAAAADomainRecords(
            launchResult.value
          )
          const {
            addAWSACMCertCAA,
            addLetsEncryptCAA,
          } = await this.digCAADomainRecords(launchResult.value)

          successResult.addAWSACMCertCAA = addAWSACMCertCAA
          successResult.addLetsEncryptCAA = addLetsEncryptCAA
          successResults.push(successResult)
        }
      }

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
