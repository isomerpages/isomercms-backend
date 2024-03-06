/* eslint-disable import/prefer-default-export */
import type { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import express, { RequestHandler } from "express"

import { config } from "@root/config/config"
import InitializationError from "@root/errors/InitializationError"
import logger from "@root/logger/logger"
import { attachFormSGHandler } from "@root/middleware"
import AuditLogsService from "@root/services/admin/AuditLogsService"
import { getField, getFieldsFromTable } from "@root/utils/formsg-utils"

interface FormsgSiteAuditLogsRouterProps {
  auditLogsService: AuditLogsService
}

const SITE_AUDIT_LOGS_FORM_KEY = config.get("formSg.siteAuditLogsFormKey")

const REQUESTER_EMAIL_FIELD = "Where should we send the email address to?"
const REPO_NAME_FIELD =
  "What is the name of the Isomer site that you need logs for? (Repo Name (in GitHub))"
const LOGS_TIMEFRAME_FIELD = "I need a log of edits made in:"
const LOGS_TIMEFRAME_START_FIELD = "Start date"
const LOGS_TIMEFRAME_END_FIELD = "End date"

export class FormsgSiteAuditLogsRouter {
  private readonly auditLogsService: FormsgSiteAuditLogsRouterProps["auditLogsService"]

  constructor({ auditLogsService }: FormsgSiteAuditLogsRouterProps) {
    this.auditLogsService = auditLogsService
  }

  getAuditLogsHandler: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    let startDate = "1970-01-01"
    let endDate = new Date().toISOString().split("T")[0]
    const repoNames: Set<string> = new Set()

    const { responses } = res.locals.submission.content

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)

    if (!requesterEmail) {
      logger.error(
        "No requester email was provided in site audit logs form submission"
      )
      return res.sendStatus(400)
    }

    const repoNamesFromTable = getFieldsFromTable(responses, REPO_NAME_FIELD)

    if (!repoNamesFromTable) {
      logger.error(
        "No repo names were provided in site audit logs form submission"
      )
      return res.sendStatus(400)
    }

    repoNamesFromTable.forEach((repoName) => {
      if (typeof repoName === "string") {
        // actually wont happen based on our formsg form, but this code
        // is added defensively
        repoNames.add(repoName)
      } else {
        repoNames.add(repoName[0])
      }
    })

    const logsTimeframe = getField(responses, LOGS_TIMEFRAME_FIELD)

    if (logsTimeframe === "The past calendar year") {
      startDate = `${new Date().getFullYear() - 1}-01-01`
      endDate = `${new Date().getFullYear() - 1}-12-31`
    } else if (logsTimeframe === "The past calendar month") {
      const startDateObject = new Date()
      startDateObject.setMonth(startDateObject.getMonth() - 1)
      const endDateObject = new Date()
      endDateObject.setDate(0)

      startDate = `${startDateObject.getFullYear()}-${startDateObject
        .getMonth()
        .toString()
        .padStart(2, "0")}-01`
      endDate = `${endDateObject.getFullYear()}-${endDateObject
        .getMonth()
        .toString()
        .padStart(2, "0")}-${endDateObject.getDate()}`
    } else {
      const startDateField = getField(responses, LOGS_TIMEFRAME_START_FIELD)
      const endDateField = getField(responses, LOGS_TIMEFRAME_END_FIELD)
      if (startDateField && endDateField) {
        startDate = startDateField
        endDate = endDateField
      }
    }

    res.sendStatus(200)

    this.auditLogsService.getAuditLogsViaFormsg(
      requesterEmail,
      Array.from(repoNames),
      startDate,
      endDate,
      req.body.data.submissionId
    )
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!SITE_AUDIT_LOGS_FORM_KEY) {
      throw new InitializationError(
        "Required SITE_AUDIT_LOGS_FORM_KEY environment variable is not defined"
      )
    }

    router.post(
      "/audit-logs",
      attachFormSGHandler(SITE_AUDIT_LOGS_FORM_KEY),
      this.getAuditLogsHandler
    )

    return router
  }
}
