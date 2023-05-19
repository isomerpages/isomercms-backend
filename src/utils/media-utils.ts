import axios from "axios"

import { config } from "@config/config"

import logger from "@root/logger/logger"
import { MediaFileInput, MediaFileOutput } from "@root/types"
import { getAccessToken } from "@root/utils/token-retrieval-utils"

const GITHUB_ORG_NAME = config.get("github.orgName")

const getEncodedFilePathAsUriComponent = (
  siteName: string,
  filePath: string,
  accessToken?: string
) => {
  const isSvg = filePath.endsWith(".svg")
  const encodedFilePath = filePath
    .split("/")
    .map((v) => encodeURIComponent(v))
    .join("/")
  return `https://${
    accessToken ? `${accessToken}@` : ""
  }raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${encodedFilePath}${
    isSvg ? "?sanitize=true" : ""
  }`
}

export const getMediaFileInfo = async ({
  file,
  siteName,
  directoryName,
  mediaType,
  isPrivate,
}: MediaFileInput): Promise<MediaFileOutput> => {
  const baseFileData = {
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
      const endpoint = getEncodedFilePathAsUriComponent(
        siteName,
        file.path,
        accessToken
      )
      const resp = await axios.get(endpoint, { responseType: "arraybuffer" })
      const data = Buffer.from(resp.data, "binary").toString("base64")
      const dataUri = `data:${resp.headers["content-type"]};base64,${data}`
      return {
        ...baseFileData,
        mediaUrl: dataUri,
      }
    } catch (err) {
      // If an error occurs while retrieving the image, we log but continue to return generic values
      logger.error(err)
      return {
        ...baseFileData,
        mediaUrl: "",
      }
    }
  }
  return {
    ...baseFileData,
    mediaUrl: getEncodedFilePathAsUriComponent(siteName, file.path),
  }
}
