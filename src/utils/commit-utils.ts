import path from "path"

export default function isFileAsset({
  directoryName,
  fileName,
}: {
  directoryName?: string | undefined
  fileName?: string | undefined
}) {
  if (!fileName && !directoryName) return false

  let filePath = ""
  if (directoryName && fileName) {
    filePath = path.join(directoryName, fileName)
  } else if (fileName) {
    filePath = fileName
  } else if (directoryName) {
    filePath = directoryName
  }

  return filePath.includes("images") || filePath.includes("files")
}
