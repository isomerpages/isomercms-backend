import { MediaFile } from "@root/utils/media-utils"

export const MEDIA_FILE_NAME = "test file"
export const MEDIA_SITE_NAME = "site"
export const MEDIA_DIRECTORY_NAME = "dir"
export const MEDIA_FILE_SHA = "sha"

export const mediaDir: MediaFile = {
  name: "directory",
  type: "dir",
  sha: MEDIA_FILE_SHA,
  path: `${MEDIA_DIRECTORY_NAME}/directory`,
}

const baseMediaFile: MediaFile = {
  name: MEDIA_FILE_NAME,
  type: "file",
  sha: MEDIA_FILE_SHA,
  path: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
}

export const svgFile = {
  ...baseMediaFile,
  name: `${MEDIA_FILE_NAME}.svg`,
  path: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
}

const baseInput = {
  siteName: MEDIA_SITE_NAME,
  directoryName: MEDIA_DIRECTORY_NAME,
}

export const dirInput = {
  ...baseInput,
  file: mediaDir,
  mediaType: "images",
  isPrivate: false,
}

export const imageFilePublicInput = {
  ...baseInput,
  file: baseMediaFile,
  mediaType: "images",
  isPrivate: false,
}

export const svgFilePublicInput = {
  ...imageFilePublicInput,
  file: svgFile,
}

export const imageFilePrivateInput = {
  ...imageFilePublicInput,
  isPrivate: true,
}

export const svgFilePrivateInput = {
  ...svgFilePublicInput,
  isPrivate: true,
}

export const pdfFilePublicInput = {
  ...imageFilePublicInput,
  mediaType: "files",
}

export const pdfFilePrivateInput = {
  ...pdfFilePublicInput,
  isPrivate: true,
}
