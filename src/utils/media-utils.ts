import axios from "axios"

import { config } from "@config/config"

import { getAccessToken } from "@root/utils/token-retrieval-utils"

const GITHUB_ORG_NAME = config.get("github.orgName")

interface mediaFile {
  name: string
  type: string
  sha: string
  path: string
}

export const getMediaFileInfo = async (
  file: mediaFile,
  siteName: string,
  directoryName: string,
  mediaType: string,
  isPrivate: boolean
) => {
  if (file.type === "dir") {
    return {
      name: file.name,
      type: "dir",
    }
  }
  const fileData = {
    mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${file.path
      .split("/")
      .map((v) => encodeURIComponent(v))
      .join("/")}${file.path.endsWith(".svg") ? "?sanitize=true" : ""}`,
    name: file.name,
    sha: file.sha,
    mediaPath: `${directoryName}/${file.name}`,
    type: file.type,
  }
  if (mediaType === "images" && isPrivate) {
    // Generate data url
    const accessToken = await getAccessToken()
    // Accessing images in this way avoids token usage
    const endpoint = `https://${accessToken}@raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${file.path
      .split("/")
      .map((v) => encodeURIComponent(v))
      .join("/")}${file.path.endsWith(".svg") ? "?sanitize=true" : ""}`
    const resp = await axios.get(endpoint, { responseType: "arraybuffer" })
    const data = Buffer.from(resp.data, "binary").toString("base64")
    const dataUrl = `data:${resp.headers["content-type"]};base64,${data}`
    fileData.mediaUrl = dataUrl
  }
  return fileData
}
