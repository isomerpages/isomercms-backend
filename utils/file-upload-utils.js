const FileType = require("file-type")

const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "gif",
  "tif",
  "bmp",
  "svg",
  "ico",
]

const validateAndSanitizeFileUpload = async (content) => {
  const fileType = await FileType.fromBuffer(Buffer.from(content, "base64"))

  if (!fileType || !ALLOWED_FILE_EXTENSIONS.includes(fileType.ext))
    return undefined
  return fileType
}

module.exports = { validateAndSanitizeFileUpload, ALLOWED_FILE_EXTENSIONS }
