const CloudmersiveVirusApiClient = require("cloudmersive-virus-api-client")
const DOMPurify = require("dompurify")
const FileType = require("file-type")
const isSvg = require("is-svg")
const { JSDOM } = require("jsdom")

const { config } = require("@config/config")

const { window } = new JSDOM("<!DOCTYPE html>")

const logger = require("@logger/logger").default

const CLOUDMERSIVE_API_KEY = config.get("cloudmersiveKey")

const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "apng",
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

// NOTE: This is NOT the default sanitiser;
// instead, we are creaitng our own instance of DOMPurify
// so that we can make it stricter solely
// for fileuploads.
const sanitizer = DOMPurify(window)

const scanFileForVirus = (fileBuffer, timeout) => {
  if (timeout) {
    defaultCloudmersiveClient.timeout = timeout
  }
  return new Promise((success, failure) => {
    apiInstance.scanFile(fileBuffer, (error, data, response) => {
      if (error) {
        logger.error({
          message: "Error when calling Cloudmersive Virus Scan API",
          error,
          meta: {
            data,
            headers: response?.headers,
          },
        })
        failure(error)
      } else {
        logger.info("Cloudmersive Virus Scan API called successfully")
        success(data)
      }
    })
  })
}

const validateAndSanitizeFileUpload = async (data) => {
  const [, content] = data.split(",")
  const fileBuffer = Buffer.from(content, "base64")
  const detectedFileType = await FileType.fromBuffer(fileBuffer)
  // NOTE: This check is required for svg files.
  // This is because svg files are a string based data type
  // and not binary based.
  // Hence, `FileType` wouldn't be able to detect the correct
  // file type for svg files.
  if (isSvg(fileBuffer)) {
    // NOTE: `isSvg` checks only using the first element,
    // which is insufficient to guarantee that this file is safe.
    // We run it thru the sanitizer again to ensure that the output
    // is safe.
    const sanitizedBuffer = sanitizer.sanitize(fileBuffer)
    return {
      content: Buffer.from(sanitizedBuffer, "utf8").toString("base64"),
      detectedFileType: { ext: "svg" },
    }
  }

  if (
    detectedFileType &&
    ALLOWED_FILE_EXTENSIONS.includes(detectedFileType.ext)
  ) {
    return { content, detectedFileType }
  }

  return undefined
}

module.exports = {
  validateAndSanitizeFileUpload,
  ALLOWED_FILE_EXTENSIONS,
  scanFileForVirus,
}
