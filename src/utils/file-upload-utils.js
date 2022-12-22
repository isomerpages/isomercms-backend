const createDOMPurify = require("dompurify")
const FileType = require("file-type")
const isSvg = require("is-svg")
const { JSDOM } = require("jsdom")

const { window } = new JSDOM("")
const DOMPurify = createDOMPurify(window)

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "gif",
  "tif",
  "bmp",
  "ico",
]

const validateAndSanitizeFileUpload = async (data) => {
  const [schema, content] = data.split(",")
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
