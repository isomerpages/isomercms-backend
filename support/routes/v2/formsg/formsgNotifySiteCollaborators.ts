/* eslint-disable import/prefer-default-export */
import type { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import express, { RequestHandler } from "express"

import { config } from "@root/config/config"
import InitializationError from "@root/errors/InitializationError"
import logger from "@root/logger/logger"
import { attachFormSGHandler } from "@root/middleware"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import type { DNSRecord } from "@root/types/siteInfo"
import { getField, getFieldsFromTable } from "@root/utils/formsg-utils"

interface FormsgNotifySiteCollaboratorsRouterProps {
  collaboratorsService: CollaboratorsService
}

const NOTIFY_SITE_COLLABORATORS_FORM_KEY = config.get(
  "formSg.notifySiteCollaboratorsFormKey"
)

const REQUESTER_EMAIL_FIELD = "Email"
const REPO_NAME_FIELD = "Repo Name (in GitHub)"
const NOTIFICATION_TYPE_FIELD = "Notification Type"
const NOTIFICATION_TYPE = {
  DNS_INCORRECT_APEX: "DNS records are incorrect (apex domain)",
  DNS_INCORRECT_MAIN: "DNS records are incorrect (main domain)",
  OTHERS: "Others",
}
const SITE_DOMAIN_NAME_APEX_FIELD = "Site Domain Name (Apex)"
const SITE_DOMAIN_NAME_FIELD = "Site Domain Name"
const CORRECT_DNS_RECORDS_FIELD = "Correct DNS Records (Source, Target, Type)"
const EMAIL_SUBJECT_FIELD = "Email Subject"
const EMAIL_MESSAGE_BODY_FIELD = "Email Message Body"

export class FormsgNotifySiteCollaboratorsRouter {
  private readonly collaboratorsService: FormsgNotifySiteCollaboratorsRouterProps["collaboratorsService"]

  constructor({
    collaboratorsService,
  }: FormsgNotifySiteCollaboratorsRouterProps) {
    this.collaboratorsService = collaboratorsService
  }

  getNotifySiteCollaboratorsHandler: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    const dnsRecords: DNSRecord[] = []

    const { responses } = res.locals.submission.content

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)

    if (!requesterEmail) {
      logger.error(
        "No requester email was provided in notify site collaborators form submission"
      )
      return res.sendStatus(400)
    }

    const repoName = getField(responses, REPO_NAME_FIELD)

    if (!repoName) {
      logger.error(
        "No repo name was provided in notify site collaborators form submission"
      )
      return res.sendStatus(400)
    }

    const notificationType = getField(responses, NOTIFICATION_TYPE_FIELD)

    if (!notificationType) {
      logger.error(
        "No notification type was provided in notify site collaborators form submission"
      )
      return res.sendStatus(400)
    }

    if (
      notificationType === NOTIFICATION_TYPE.DNS_INCORRECT_APEX ||
      notificationType === NOTIFICATION_TYPE.DNS_INCORRECT_MAIN
    ) {
      const domainName =
        getField(responses, SITE_DOMAIN_NAME_FIELD) ||
        getField(responses, SITE_DOMAIN_NAME_APEX_FIELD)

      if (!domainName) {
        logger.error(
          "No site domain name was provided in notify site collaborators form submission"
        )
        return res.sendStatus(400)
      }

      const correctDnsRecords = getFieldsFromTable(
        responses,
        CORRECT_DNS_RECORDS_FIELD
      )

      if (!correctDnsRecords) {
        logger.error(
          "No correct DNS records were provided in notify site collaborators form submission"
        )
        return res.sendStatus(400)
      }

      correctDnsRecords
        .map(
          (record): DNSRecord => ({
            source: record[0],
            target: record[1],
            type: record[2] === "A Record" ? "A" : "CNAME",
          })
        )
        .forEach((record) => {
          dnsRecords.push(record)
        })

      res.sendStatus(200)

      this.collaboratorsService.notifyWithDnsRecords(
        notificationType === NOTIFICATION_TYPE.DNS_INCORRECT_APEX
          ? "apex"
          : "main",
        repoName,
        domainName,
        dnsRecords,
        requesterEmail
      )
    } else {
      const emailSubject = getField(responses, EMAIL_SUBJECT_FIELD)
      const emailMessageBody = getField(responses, EMAIL_MESSAGE_BODY_FIELD)

      if (!emailSubject || !emailMessageBody) {
        logger.error(
          "Email subject or email message body was not provided in notify site collaborators form submission"
        )
        return res.sendStatus(400)
      }

      res.sendStatus(200)

      this.collaboratorsService.notify(
        repoName,
        emailSubject,
        emailMessageBody,
        requesterEmail
      )
    }
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!NOTIFY_SITE_COLLABORATORS_FORM_KEY) {
      throw new InitializationError(
        "Required NOTIFY_SITE_COLLABORATORS_FORM_KEY environment variable is not defined"
      )
    }

    router.post(
      "/notify-collaborators",
      attachFormSGHandler(NOTIFY_SITE_COLLABORATORS_FORM_KEY),
      this.getNotifySiteCollaboratorsHandler
    )

    return router
  }
}
