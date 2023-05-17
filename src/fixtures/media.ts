import { MediaType, MediaFile } from "@root/types"

export const MEDIA_FILE_NAME = "test file"
export const MEDIA_SITE_NAME = "site"
export const MEDIA_DIRECTORY_NAME = "dir"
export const MEDIA_SUBDIRECTORY_NAME = "sub dir"
export const MEDIA_FILE_SHA = "sha"

export const MEDIA_DIR: MediaFile = {
  name: "directory",
  type: "dir",
  sha: MEDIA_FILE_SHA,
  path: `${MEDIA_DIRECTORY_NAME}/directory`,
}

const BASE_MEDIA_FILE: MediaFile = {
  name: MEDIA_FILE_NAME,
  type: "file",
  sha: MEDIA_FILE_SHA,
  path: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
}

export const NESTED_MEDIA_FILE: MediaFile = {
  ...BASE_MEDIA_FILE,
  path: `${MEDIA_DIRECTORY_NAME}/${MEDIA_SUBDIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
}

export const SVG_FILE = {
  ...BASE_MEDIA_FILE,
  name: `${MEDIA_FILE_NAME}.svg`,
  path: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
}

const BASE_INPUT = {
  siteName: MEDIA_SITE_NAME,
  directoryName: MEDIA_DIRECTORY_NAME,
}

export const DIR_INPUT = {
  ...BASE_INPUT,
  file: MEDIA_DIR,
  mediaType: "images" as MediaType,
  isPrivate: false,
}

export const IMAGE_FILE_PUBLIC_INPUT = {
  ...BASE_INPUT,
  file: BASE_MEDIA_FILE,
  mediaType: "images" as MediaType,
  isPrivate: false,
}

export const NESTED_IMAGE_FILE_PUBLIC_INPUT = {
  ...IMAGE_FILE_PUBLIC_INPUT,
  file: NESTED_MEDIA_FILE,
  directoryName: `${MEDIA_DIRECTORY_NAME}/${MEDIA_SUBDIRECTORY_NAME}`,
}

export const SVG_FILE_PUBLIC_INPUT = {
  ...IMAGE_FILE_PUBLIC_INPUT,
  file: SVG_FILE,
}

export const IMAGE_FILE_PRIVATE_INPUT = {
  ...IMAGE_FILE_PUBLIC_INPUT,
  isPrivate: true,
}

export const SVG_FILE_PRIVATE_INPUT = {
  ...SVG_FILE_PUBLIC_INPUT,
  isPrivate: true,
}

export const PDF_FILE_PUBLIC_INPUT = {
  ...IMAGE_FILE_PUBLIC_INPUT,
  mediaType: "files" as MediaType,
}

export const PDF_FILE_PRIVATE_INPUT = {
  ...PDF_FILE_PUBLIC_INPUT,
  isPrivate: true,
}
