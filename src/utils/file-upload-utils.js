import { config } from "@config/config"

import logger from "@logger/logger"

const CloudmersiveVirusApiClient = require("cloudmersive-virus-api-client")
const FileType = require("file-type")
const isSvg = require("is-svg")

const { sanitizer } = require("@services/utilServices/Sanitizer")

const CLOUDMERSIVE_API_KEY = config.get("cloudmersiveKey")

const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "gif",
  "tif",
  "bmp",
  "ico",
  "svg",
]
const defaultCloudmersiveClient = CloudmersiveVirusApiClient.ApiClient.instance

// Configure API key authorization: Apikey
const apikey = defaultCloudmersiveClient.authentications.Apikey
apikey.apiKey = CLOUDMERSIVE_API_KEY

const apiInstance = new CloudmersiveVirusApiClient.ScanApi()

const scanFileForVirus = (fileBuffer) =>
  new Promise((success, failure) => {
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

const validateAndSanitizeFileUpload = async (data) => {
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

module.exports = {
  validateAndSanitizeFileUpload,
  scanFileForVirus,
  ALLOWED_FILE_EXTENSIONS,
}
