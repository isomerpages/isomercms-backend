import CloudmersiveVirusApiClient from "cloudmersive-virus-api-client"
import FileType from "file-type"
import isSvg from "is-svg"

import { config } from "@config/config"

import { sanitizer } from "@services/utilServices/Sanitizer"

const logger = require("@logger/logger").default

const CLOUDMERSIVE_API_KEY = config.get("cloudmersiveKey")

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "tif",
  "tiff",
  "bmp",
  "ico",
  "svg",
]
const defaultCloudmersiveClient = CloudmersiveVirusApiClient.ApiClient.instance

// Configure API key authorization: Apikey
const apikey = defaultCloudmersiveClient.authentications.Apikey
apikey.apiKey = CLOUDMERSIVE_API_KEY

const apiInstance = new CloudmersiveVirusApiClient.ScanApi()

export const scanFileForVirus = (fileBuffer, timeout) => {
  if (timeout) {
    defaultCloudmersiveClient.timeout = timeout
  }
  return new Promise((success, failure) => {
    apiInstance.scanFile(fileBuffer, (error, data) => {
      if (error) {
        logger.error(
          `Error when calling Cloudmersive Virus Scan API: ${error.message}`
        )
        failure(error)
      } else {
        logger.info("Cloudmersive Virus Scan API called successfully")
        success(data)
      }
    })
  })
}

export const validateAndSanitizeFileUpload = async (data) => {
  const [, content] = data.split(",")
  const fileBuffer = Buffer.from(content, "base64")
  const detectedFileType = await FileType.fromBuffer(fileBuffer)

  if (isSvg(fileBuffer)) {
    const sanitizedBuffer = sanitizer.sanitize(fileBuffer)
    return Buffer.from(sanitizedBuffer, "utf8").toString("base64")
  }
  if (
    detectedFileType &&
    ALLOWED_FILE_EXTENSIONS.includes(detectedFileType.ext)
  ) {
    return content
  }

  return undefined
}
