const createDOMPurify = require("dompurify")
const FileType = require("file-type")
const isSvg = require("is-svg")
const { JSDOM } = require("jsdom")

const config = require("@config/config")

const { window } = new JSDOM("")
const DOMPurify = createDOMPurify(window)

const ALLOWED_FILE_EXTENSIONS = config.get("app.allowedFileExtensions")

const validateAndSanitizeFileUpload = async (content) => {
  const fileBuffer = Buffer.from(content, "base64")
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

module.exports = { validateAndSanitizeFileUpload }
