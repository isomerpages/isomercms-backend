import logger from "@logger/logger"

const { CM_API_KEY } = process.env
const CloudmersiveVirusApiClient = require('cloudmersive-virus-api-client')
const FileType = require("file-type")
const isSvg = require("is-svg")
const DOMPurify = require("isomorphic-dompurify")

const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "gif",
  "tif",
  "bmp",
  "ico",
]
const defaultClient = CloudmersiveVirusApiClient.ApiClient.instance;

// Configure API key authorization: Apikey
const apikey = defaultClient.authentications.Apikey
apikey.apiKey = CM_API_KEY

const apiInstance = new CloudmersiveVirusApiClient.ScanApi()

const scanFileForVirus = (fileBuffer) => new Promise((success, failure) => {
    apiInstance.scanFile(fileBuffer, (error, data, response) => {
      if (error) {
        logger.error('Error when calling cloudmersive API')
        failure(error)
      } else {
        logger.info('Virus Scan API called successfully')
        success(data)
      }
    })
})

const validateAndSanitizeFileUpload = async (content, fileBuffer) => {
  const detectedFileType = await FileType.fromBuffer(fileBuffer)

  if (isSvg(fileBuffer)) {
    const sanitizedBuffer = DOMPurify.sanitize(fileBuffer)
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

module.exports = { validateAndSanitizeFileUpload, scanFileForVirus }
