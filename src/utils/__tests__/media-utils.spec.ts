import axios from "axios"

import { config } from "@config/config"

import {
  MEDIA_DIRECTORY_NAME,
  MEDIA_FILE_NAME,
  MEDIA_FILE_SHA,
  MEDIA_SITE_NAME,
  IMAGE_FILE_PRIVATE_INPUT,
  IMAGE_FILE_PUBLIC_INPUT,
  PDF_FILE_PRIVATE_INPUT,
  PDF_FILE_PUBLIC_INPUT,
  SVG_FILE_PRIVATE_INPUT,
  SVG_FILE_PUBLIC_INPUT,
} from "@root/fixtures/media"

import { getMediaFileInfo, isMediaFileOutput } from "../media-utils"

const GITHUB_ORG_NAME = config.get("github.orgName")

jest.mock("@utils/token-retrieval-utils", () => ({
  getAccessToken: jest.fn().mockResolvedValue("token"),
}))
jest.mock("axios", () => ({
  get: jest.fn().mockResolvedValue({
    data: "blahblah",
    headers: {
      "content-type": "blahblah",
    },
  }),
}))

describe("Media utils test", () => {
  it("should return normal information for images in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(imageFilePublicInput)).toStrictEqual(
      expectedResp
    )
  })

  it("should return normal information for svgs in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}.svg?sanitize=true`,
      name: `${MEDIA_FILE_NAME}.svg`,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
      type: "file",
    }
    expect(await getMediaFileInfo(svgFilePublicInput)).toStrictEqual(
      expectedResp
    )
  })

  it("should return normal information for files in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(pdfFilePublicInput)).toStrictEqual(
      expectedResp
    )
  })

  it("should handle mediaUrl for images in private repos", async () => {
    const expectedPartialResp = {
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    const resp = await getMediaFileInfo(imageFilePrivateInput)
    if (!isMediaFileOutput(resp)) {
      fail("Should not reach here")
    }
    expect(resp).toStrictEqual(expect.objectContaining(expectedPartialResp))
    expect(resp.mediaUrl).toContain("data:")
    expect(
      axios.get
    ).toHaveBeenCalledWith(
      `https://token@raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      { responseType: "arraybuffer" }
    )
  })

  it("should handle mediaUrl for svgs in private repos", async () => {
    const expectedPartialResp = {
      name: `${MEDIA_FILE_NAME}.svg`,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
      type: "file",
    }
    const resp = await getMediaFileInfo(svgFilePrivateInput)
    if (!isMediaFileOutput(resp)) {
      fail("Should not reach here")
    }
    expect(resp).toStrictEqual(expect.objectContaining(expectedPartialResp))
    expect(resp.mediaUrl).toContain("data:")
    expect(
      axios.get
    ).toHaveBeenCalledWith(
      `https://token@raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}.svg?sanitize=true`,
      { responseType: "arraybuffer" }
    )
  })

  it("should return normal information for files in private repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(pdfFilePrivateInput)).toStrictEqual(
      expectedResp
    )
  })
})
