import { DecryptedContentAndAttachments } from "@opengovsg/formsg-sdk/dist/types"
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

const EGAZETTE_FORM_KEY = config.get("formSg.eGazetteFormKey")
const EGAZETTE_S3_BUCKET = config.get("egazette.s3Bucket")

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
    logger.info("Received egazette publish request")

    const { responses } = res.locals.submission.content

    // Retrieve form details

    // Gazette Notification Number
    const gazetteNotificationNum = getField(
      responses,
      formStructure.gazetteDetails.notificationNumber
    )
    if (!gazetteNotificationNum) {
      logger.error(
        "Gazette notification number is missing in form submission. Skip processing..."
      )
    }

    // Publisher Email
    const publisherEmail = getField(responses, formStructure.publisherEmail)
    if (!publisherEmail) {
      logger.error(
        "Missing publisher email in form submission. Skip processing..."
      )
    }

    // Gazette Title
    const gazetteTitle = getField(responses, formStructure.gazetteDetails.title)
    if (!gazetteTitle) {
      logger.error("Missing title for the gazette. Skipping...")
    }

    // Publish Time
    const publishTime = res.locals.submission.createdAt
    if (!publishTime) {
      logger.error("No publish time found. Skipping...")
    }

    // Gazette Category
    const gazetteCategory = getField(
      responses,
      formStructure.gazetteDetails.category
    )
    if (!gazetteCategory) {
      logger.error("Missing category for the gazette. Skipping...")
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
      logger.error(`Missing sub-category for ${gazetteCategory}. Skipping...`)
    }

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

    for (const [key, value] of Object.entries(attachments)) {
      if (value) {
        try {
          const uploadResponse = await this.s3Service.uploadBlob(
            EGAZETTE_S3_BUCKET,
            objectKey,
            value.content
          )
          console.log(`Received upload response from S3Service`, uploadResponse)
        } catch (err) {
          logger.error(
            `Uploading gazette to S3 Bucket failed with error: ${JSON.stringify(
              err
            )}`
          )
          console.log(`S3 err`, err)
        }
      }
    }
    console.log(`raw data`, attachments)

    // Add to search index
    // NOTE: Using `!` here to force unwrap as validation has been done above
    await this.addToSearchIndex(
      gazetteCategory!,
      gazetteSubCategory!,
      gazetteNotificationNum!,
      gazetteTitle!,
      publishTime,
      objectKey
    )

    return res.sendStatus(200)
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
      newSearchRecord.objectID = `${gazetteCategory}-${gazetteSubCategory}-${gazetteNotificationNum}`
    } else {
      newSearchRecord.objectID = `${gazetteCategory}-${gazetteNotificationNum}`
    }

    console.log(`Adding record to search index`, newSearchRecord)

    // publish to index
    try {
      await this.searchService.addToIndex(newSearchRecord)
    } catch (e) {
      logger.error(
        `Adding to search index failed with error: ${JSON.stringify(e)}`
      )
      console.log("Add to search index err", e)
    }
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
