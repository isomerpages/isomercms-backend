export default function isFileAsset(path: string) {
  return path.includes("images/") || path.includes("files/")
}
