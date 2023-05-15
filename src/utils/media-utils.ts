import axios from "axios"

import { config } from "@config/config"

import logger from "@root/logger/logger"
import { MediaFileInput, MediaFileOutput } from "@root/types"
import { getAccessToken } from "@root/utils/token-retrieval-utils"

const GITHUB_ORG_NAME = config.get("github.orgName")

export const isMediaFileOutput = (t: MediaFileOutput): t is MediaFileOutput =>
  (t as MediaFileOutput).sha !== undefined

export const getMediaFileInfo = async ({
  file,
  siteName,
  directoryName,
  mediaType,
  isPrivate,
}: MediaFileInput): Promise<MediaFileOutput> => {
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
    try {
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
    } catch (err) {
      // If an error occurs while retrieving the image, we log but continue to return generic values
      logger.error(err)
      fileData.mediaUrl = ""
    }
  }
  return fileData
}
