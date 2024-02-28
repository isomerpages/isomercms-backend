import { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
import axios, { AxiosRequestConfig } from "axios"
import express from "express"

import { config } from "@config/config"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { BadRequestError } from "@root/errors/BadRequestError"
import InitializationError from "@root/errors/InitializationError"
import logger from "@root/logger/logger"
import { attachFormSGHandler } from "@root/middleware"
import S3Service from "@root/services/egazette/S3Service"
import SearchService from "@root/services/egazette/SearchService"
import { RequestHandler } from "@root/types"
import { getField } from "@root/utils/formsg-utils"
import { mailer } from "@services/utilServices/MailClient"

const EGAZETTE_FORM_KEY = config.get("formSg.eGazetteFormKey")
const EGAZETTE_S3_BUCKET = config.get("egazette.s3Bucket")
const DATASET_ID = config.get("dgs.datasetId")
const DGS_API_KEY = config.get("dgs.apiKey")

const dgsApiDomain = "https://api-staging.data.gov.sg"
const axiosConfig: AxiosRequestConfig = {
  baseURL: dgsApiDomain,
  headers: {
    "x-dgs-admin-api-key": DGS_API_KEY,
  },
}
const axiosInstance = axios.create(axiosConfig)

const formStructure = {
  publisherEmail: "Email",
  gazetteDetails: {
    title: "Gazette title",
    notificationNumber: "Gazette notification number",
    category: "Category",
    subCategoryGovGazette: "Sub-category (Government Gazette)",
    subCategorySupplements: "Sub-category (Supplements)",
    subCategoryLegislativeGazettes: "Sub-category (Legislative Gazettes)",
    document: "Gazette document",
  },
}

interface FormsgEGazetteRouterProps {
  searchService: SearchService
  s3Service: S3Service
}

export type SearchRecord = {
  objectID: string
  title: string
  category: string
  subCategory: string
  notificationNum: string
  publishDate: string
  publishTimestamp: number
  fileUrl: string
}

function toTimestamp(strDate: string) {
  const datum = new Date(strDate)
  return datum.getTime()
}

function formatObjectId(objectId: string) {
  // Remove apostrophes and whitespaces
  let formattedId = objectId.replace(/['\s]/g, "")

  // If the first character is a dash, remove it
  if (formattedId.startsWith("-")) {
    formattedId = formattedId.substring(1)
  }

  return formattedId
}

function getS3ObjectUrl(
  bucketName: string,
  region: string,
  objectKey: string
): string {
  const encodedObjectKey = encodeURIComponent(objectKey)
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedObjectKey}`
}

type DecryptedPayload = {
  createdAt: string
} & DecryptedContentAndAttachments

export class FormsgEGazetteRouter {
  private readonly searchService: FormsgEGazetteRouterProps["searchService"]

  private readonly s3Service: FormsgEGazetteRouterProps["s3Service"]

  constructor({ searchService, s3Service }: FormsgEGazetteRouterProps) {
    this.searchService = searchService
    this.s3Service = s3Service
  }

  formsgEGazettePublish: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedPayload }
  > = async (req, res) => {
    const { submissionId } = req.body.data
    logger.info("Received egazette publish request")

    const { responses } = res.locals.submission.content

    // Retrieve form details

    // Publisher Email
    const publisherEmail = getField(responses, formStructure.publisherEmail)
    if (!publisherEmail) {
      logger.error(
        "Missing publisher email in form submission. Skip processing..."
      )
      return res.sendStatus(200)
    }

    // Gazette Title
    const gazetteTitle = getField(responses, formStructure.gazetteDetails.title)
    if (!gazetteTitle) {
      const errMessage = `Missing title for the gazette of submission ${submissionId}.`
      logger.error(`${errMessage}`)
      await this.sendFailureEmail(publisherEmail, "", submissionId, errMessage)
      return res.sendStatus(200)
    }

    // Gazette Notification Number
    const gazetteNotificationNum = getField(
      responses,
      formStructure.gazetteDetails.notificationNumber
    )
    if (!gazetteNotificationNum) {
      const errMessage = `Missing gazette notification number for the gazette of submission ${submissionId}.`
      logger.error(errMessage)
      await this.sendFailureEmail(publisherEmail, "", submissionId, errMessage)
      return res.sendStatus(200)
    }

    // Publish Time
    const publishTime = res.locals.submission.createdAt
    if (!publishTime) {
      const errMessage = `Missing publish time for the gazette of submission ${submissionId}.`
      logger.error(errMessage)
      await this.sendFailureEmail(publisherEmail, "", submissionId, errMessage)
      return res.sendStatus(200)
    }

    // Gazette Category
    const gazetteCategory = getField(
      responses,
      formStructure.gazetteDetails.category
    )
    if (!gazetteCategory) {
      const errMessage = `Missing category for the gazette of submission ${submissionId}.`
      logger.error(errMessage)
      await this.sendFailureEmail(publisherEmail, "", submissionId, errMessage)
      return res.sendStatus(200)
    }

    // Gazette Sub-Category
    let gazetteSubCategory = null
    switch (gazetteCategory) {
      case "Government Gazette":
        gazetteSubCategory = getField(
          responses,
          formStructure.gazetteDetails.subCategoryGovGazette
        )
        break
      case "Supplements":
        gazetteSubCategory = getField(
          responses,
          formStructure.gazetteDetails.subCategorySupplements
        )
        break
      case "Legislative Gazettes":
        gazetteSubCategory = getField(
          responses,
          formStructure.gazetteDetails.subCategoryLegislativeGazettes
        )
        break
      default:
        break
    }

    if (
      (gazetteCategory === "Government Gazette" ||
        gazetteCategory === "Supplements" ||
        gazetteCategory === "Legislative Gazettes") &&
      !gazetteSubCategory
    ) {
      const errMessage = `Missing sub-category for the gazette of submission ${submissionId}.`
      logger.error(errMessage)
      await this.sendFailureEmail(publisherEmail, "", submissionId, errMessage)
      return res.sendStatus(200)
    }

    res.sendStatus(200) // we have received the form and obtained relevant field

    console.log(`Aggregated details from subsmission`, {
      publisherEmail,
      publishTime,
      gazetteTitle,
      gazetteCategory,
      gazetteSubCategory,
      gazetteNotificationNum,
    })

    const objectKey = gazetteSubCategory
      ? `${gazetteCategory}/${gazetteSubCategory}/${gazetteNotificationNum}.pdf`
      : `${gazetteCategory}/${gazetteNotificationNum}.pdf`
    const { attachments } = res.locals.submission

    // Should only have one attachment
    if (Object.keys(attachments).length !== 1) {
      // TODO: Add custom error type
      throw new Error("More than 1 attachment found!")
    }

    const value = Object.values(attachments)[0]
    if (value) {
      try {
        const uploadResponse = await this.s3Service.uploadBlob(
          EGAZETTE_S3_BUCKET,
          objectKey,
          value.content
        )
        logger.info("Successfully uploaded gazette to S3 bucket")
      } catch (err) {
        const errMessage = `Uploading gazette to S3 Bucket failed with error: ${JSON.stringify(
          err
        )}`
        logger.error(errMessage)
        await this.sendFailureEmail(
          publisherEmail,
          gazetteTitle,
          submissionId,
          errMessage
        )
        return
      }
    }

    // Add to search index
    // NOTE: Using `!` here to force unwrap as validation has been done above
    try {
      await this.addToSearchIndex(
        gazetteCategory,
        gazetteSubCategory!,
        gazetteNotificationNum,
        gazetteTitle,
        publishTime,
        objectKey
      )
    } catch (err) {
      const errMessage = `Uploading to search index failed with error: ${JSON.stringify(
        err
      )}`
      logger.error(errMessage)
      await this.sendFailureEmail(
        publisherEmail,
        gazetteTitle,
        submissionId,
        errMessage
      )
      return
    }

    try {
      const subjectField = `<a href='https://${EGAZETTE_S3_BUCKET}.s3.amazonaws.com/${objectKey}'>${gazetteTitle}</a>`
      // TODO: replace with json - each subcategory has their own respective resourceId
      const dgsRecords = await this.fetchDgsRecords(DATASET_ID)
      const timeOffset = 8 * 60 * 60 * 1000
      const publishTimeObject = new Date(
        new Date(publishTime).getTime() + timeOffset
      )
      dgsRecords.push({
        _id: dgsRecords.length + 1,
        Notification_No: gazetteNotificationNum,
        Subject: subjectField,
        Published_Date: publishTimeObject.toISOString().split("T")[0],
      })
      await this.updateDgsRecords(DATASET_ID, dgsRecords)
    } catch (err) {
      const errMessage = `Uploading to DGS failed with error: ${JSON.stringify(
        err
      )}`
      logger.error(errMessage)
      await this.sendFailureEmail(
        publisherEmail,
        gazetteTitle,
        submissionId,
        errMessage
      )
      return
    }

    await this.sendSuccessEmail(
      publisherEmail,
      gazetteTitle,
      submissionId,
      getS3ObjectUrl(EGAZETTE_S3_BUCKET, config.get("aws.region"), objectKey)
    )
  }

  async sendFailureEmail(
    email: string,
    gazetteName: string,
    submissionId: string,
    error: string
  ) {
    const subject = `[Isomer] Upload gazette ${gazetteName} FAILURE`
    const html = `<p>Gazette ${gazetteName} was <b>not</b> uploaded successfully. (Form submission id [${submissionId}])</p>
      <p>${error}</p>`
    await mailer.sendMail(email, subject, html)
  }

  async sendSuccessEmail(
    email: string,
    gazetteName: string,
    submissionId: string,
    url: string
  ) {
    const subject = `[Isomer] Upload gazette ${gazetteName} SUCCESS`
    const html = `<p>Gazette ${gazetteName} was uploaded successfully. (Form submission id [${submissionId}])</p>
      <p>The file can be accessed at ${url}</p>`
    await mailer.sendMail(email, subject, html)
  }

  async addToSearchIndex(
    gazetteCategory: string,
    gazetteSubCategory: string,
    gazetteNotificationNum: string,
    gazetteTitle: string,
    publishTime: string,
    objectKey: string
  ) {
    const newSearchRecord = {
      category: gazetteCategory!,
      subCategory: gazetteSubCategory || "",
      notificationNum: gazetteNotificationNum!,
      title: gazetteTitle!,
      publishDate: publishTime!,
      publishTimestamp: toTimestamp(publishTime),
      fileUrl: getS3ObjectUrl(
        EGAZETTE_S3_BUCKET,
        config.get("aws.region"),
        objectKey
      ),
      objectID: "",
    }

    if (gazetteSubCategory) {
      newSearchRecord.objectID = formatObjectId(
        `${gazetteCategory}-${gazetteSubCategory}-${gazetteNotificationNum}-${gazetteTitle}`
      )
    } else {
      newSearchRecord.objectID = formatObjectId(
        `${gazetteCategory}-${gazetteNotificationNum}-${gazetteTitle}`
      )
    }

    logger.info(
      `Adding record to search index ${JSON.stringify(newSearchRecord)}`
    )

    // publish to index
    try {
      await this.searchService.addToIndex(newSearchRecord)
    } catch (e) {
      logger.error(
        `Adding to search index failed with error: ${JSON.stringify(e)}`
      )
    }
  }

  async fetchDgsRecords(resourceId: string) {
    // const domain = "https://data.gov.sg"
    const domain =
      "https://35q3y4991j.execute-api.ap-southeast-1.amazonaws.com/"
    let records: object[] = []
    let url = `${domain}/api/action/datastore_search?resource_id=${resourceId}`

    try {
      while (url) {
        let response = null
        try {
          // eslint-disable-next-line no-await-in-loop
          response = await axios.get(url)
        } catch (err) {
          const errorMessage = `Error when retrieving DGS records: ${err}`
          throw new Error(errorMessage)
        }

        const { data } = response
        if (data && data.success) {
          records = records.concat(data.result.records)

          // Check if there's a next URL
          if (
            data.result._links &&
            data.result._links.next &&
            ((data.result.total > 100 && !data.result.offset) || // default is return 100
              data.result.offset < data.result.total)
          ) {
            url = domain + data.result._links.next // Construct the next URL
          } else {
            break
          }
        } else {
          throw new Error(
            "API response when retrieving DGS records was unsuccessful."
          )
        }
      }
    } catch (error) {
      const errorMessage = `Error fetching paginated data from API: ${JSON.stringify(
        error
      )}`
      logger.error(errorMessage)
      throw error // Propagate the error up to be handled in the calling function
    }

    return records // Return the combined records from all pages
  }

  formatDgsSubmission(objects: any[]): string {
    const headers = ["Notification_No", "Subject", "Published_Date"]
    const headerRow = headers.join(",")

    const csvRows = objects.map((obj) =>
      headers.map((header) => obj[header]).join(",")
    )
    const csvContent = [headerRow, ...csvRows].join("\n")

    return csvContent
  }

  async updateDgsRecords(resourceId: string, records: object[]) {
    const endpoint = `/v2/admin/api/datasets/${resourceId}/upload-link`

    try {
      const uploadEndpoint = await axiosInstance.get<{
        data: {
          url: string
        }
      }>(endpoint)

      await axios.put(
        uploadEndpoint.data.data.url,
        this.formatDgsSubmission(records)
      )

      await this.pollUpdates(resourceId)
    } catch (error) {
      const errorMessage = `Error when updating records: ${JSON.stringify(
        error
      )}`
      logger.error(errorMessage)
      throw error
    }
  }

  async pollUpdates(resourceId: string): Promise<boolean> {
    const POLLING_INTERVAL = 30 * 1000 // Poll every 30 seconds
    // Await first - querying too quickly returns the previous ingestion result
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL))
    const ingestionEndpoint = `/v2/admin/api/datasets/${resourceId}/ingestion-status`
    const statusResp = await axiosInstance.get(ingestionEndpoint)
    if (statusResp.data.data.status === "INGESTION_SUCCESS") return true
    if (
      statusResp.data.data.status === "VALIDATION_FAILED" ||
      statusResp.data.data.status === "INGESTION_FAILED"
    )
      throw new Error(`Failed to upload to DGS: ${statusResp.data.data.status}`)
    return this.pollUpdates(resourceId)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!EGAZETTE_FORM_KEY) {
      throw new InitializationError(
        "Required EGAZETTE_FORM_KEY environment variable is empty."
      )
    }
    router.post(
      "/publish-gazette",
      attachFormSGHandler(EGAZETTE_FORM_KEY),
      this.formsgEGazettePublish
    )

    return router
  }
}
