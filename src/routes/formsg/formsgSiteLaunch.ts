import { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import autoBind from "auto-bind"
import express, { RequestHandler } from "express"
import { err, ok } from "neverthrow"
import dig from "node-dig-dns"

import { config } from "@config/config"

import baseLogger from "@logger/logger"

import InitializationError from "@errors/InitializationError"

import { getField, getFieldsFromTable } from "@utils/formsg-utils"

import { ISOMER_SUPPORT_EMAIL } from "@root/constants"
import { attachFormSGHandler } from "@root/middleware"
import { mailer } from "@root/services/utilServices/MailClient"
import {
  DnsRecordsEmailProps,
  LaunchFailureEmailProps,
  getDNSRecordsEmailBody,
  getErrorEmailBody,
} from "@root/services/utilServices/SendDNSRecordEmailClient"
import TRUSTED_AMPLIFY_CAA_RECORDS from "@root/types/caaAmplify"
import { DigResponse, DigType } from "@root/types/dig"
import UsersService from "@services/identity/UsersService"
import InfraService from "@services/infra/InfraService"

const logger = baseLogger.child({ module: "formsgSiteLaunch" })

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

  digDomainRecords = async (
    domain: string,
    digType: DigType
  ): Promise<DigResponse | null> =>
    dig([domain, digType])
      .then((result: DigResponse) => {
        logger.info(`Received DIG response: ${JSON.stringify(result)}`)
        return result
      })
      .catch((error: unknown) => {
        logger.error(`An error occurred while performing dig`, {
          error,
          params: { domain, digType },
        })
        return null
      })

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
          // check for AAAA records
          const quadADigResponse = await this.digDomainRecords(
            launchResult.value.primaryDomainSource,
            "AAAA"
          )
          const caaDigResponse = await this.digDomainRecords(
            launchResult.value.primaryDomainSource,
            "CAA"
          )

          const successResult: DnsRecordsEmailProps = launchResult.value
          if (quadADigResponse && quadADigResponse.answer) {
            const quadARecords = quadADigResponse.answer
            successResult.quadARecords = quadARecords.map((record) => ({
              domain: record.domain,
              class: record.class,
              type: record.type,
              value: record.value,
            }))
          } else {
            logger.info(
              `Unable to get dig response for domain: ${launchResult.value.primaryDomainSource}. Skipping check for AAAA records`
            )
          }

          if (!caaDigResponse) {
            logger.info(
              `Unable to get dig response for domain: ${launchResult.value.primaryDomainSource}. Skipping check for CAA records`
            )
          } else if (caaDigResponse.answer) {
            const caaRecords = caaDigResponse.answer

            /**
             * NOTE: If there exists more than one CAA Record, we need to
             * 1. check if they have whitelisted Amazon CAA
             * 2. if not, send email to inform them to whitelist Amazon CAA
             */
            const hasAmazonCAAWhitelisted = caaRecords.some((record) => {
              const isAmazonCAA = TRUSTED_AMPLIFY_CAA_RECORDS.some(
                (trustedCAA) => trustedCAA === record.value
              )
              return isAmazonCAA
            })
            if (caaRecords.length > 0 && !hasAmazonCAAWhitelisted) {
              successResult.addCAARecord = true
            } else {
              successResult.addCAARecord = false
            }
          } else {
            logger.info(
              `${launchResult.value.primaryDomainSource} Domain does not have any CAA records.`
            )
          }
          // Create better uptime monitor
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
    } catch (error) {
      logger.error(
        `Something unexpected went wrong when launching sites from form submission ${submissionId}.`,
        {
          error,
          params: {
            submissionId,
            formResponses,
          },
        }
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
