import path from "path"

export default function isFileAsset({
  directoryName,
  fileName,
}: {
  directoryName?: string | undefined
  fileName?: string | undefined
}) {
  const filePath = path.join(directoryName ?? "", fileName ?? "")

  return (
    filePath === "images" ||
    filePath?.startsWith("images/") ||
    filePath === "files" ||
    filePath?.startsWith("files/")
  )
}
