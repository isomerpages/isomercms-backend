import mockAxios from "jest-mock-axios"

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
  MEDIA_SUBDIRECTORY_NAME,
  NESTED_IMAGE_FILE_PUBLIC_INPUT,
} from "@root/fixtures/media"

import { getMediaFileInfo } from "../media-utils"

const GITHUB_ORG_NAME = config.get("github.orgName")

const mockGenericAxios = mockAxios.create()

jest.mock("@utils/token-retrieval-utils", () => ({
  getAccessToken: jest.fn().mockResolvedValue("token"),
}))
mockGenericAxios.get.mockResolvedValue({
  data: "blahblah",
  headers: {
    "content-type": "blahblah",
  },
})

describe("Media utils test", () => {
  it("should return mediaUrl as raw github information for images in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(IMAGE_FILE_PUBLIC_INPUT)).toStrictEqual(
      expectedResp
    )
  })

  it("should handle nested images in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_SUBDIRECTORY_NAME
      )}/${encodeURIComponent(MEDIA_FILE_NAME)}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_SUBDIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(
      await getMediaFileInfo(NESTED_IMAGE_FILE_PUBLIC_INPUT)
    ).toStrictEqual(expectedResp)
  })

  it("should return mediaUrl as raw github information for svgs with sanitisation in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}.svg?sanitize=true`,
      name: `${MEDIA_FILE_NAME}.svg`,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
      type: "file",
    }
    expect(await getMediaFileInfo(SVG_FILE_PUBLIC_INPUT)).toStrictEqual(
      expectedResp
    )
  })

  it("should return mediaUrl as raw github information for files in public repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(PDF_FILE_PUBLIC_INPUT)).toStrictEqual(
      expectedResp
    )
  })

  it("should return the mediaUrl as a data url for images in private repos", async () => {
    const expectedPartialResp = {
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    const resp = await getMediaFileInfo(IMAGE_FILE_PRIVATE_INPUT)
    expect(resp).toStrictEqual(expect.objectContaining(expectedPartialResp))
    expect(resp.mediaUrl).toContain("data:")
    expect(
      mockGenericAxios.get
    ).toHaveBeenCalledWith(
      `https://token@raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      { responseType: "arraybuffer" }
    )
  })

  it("should return the mediaUrl as a data url for svgs and sanitise the svgs for svgs in private repos", async () => {
    const expectedPartialResp = {
      name: `${MEDIA_FILE_NAME}.svg`,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}.svg`,
      type: "file",
    }
    const resp = await getMediaFileInfo(SVG_FILE_PRIVATE_INPUT)
    expect(resp).toStrictEqual(expect.objectContaining(expectedPartialResp))
    expect(resp.mediaUrl).toContain("data:")
    expect(
      mockGenericAxios.get
    ).toHaveBeenCalledWith(
      `https://token@raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}.svg?sanitize=true`,
      { responseType: "arraybuffer" }
    )
  })

  it("should return mediaUrl as raw github information information for files in private repos", async () => {
    const expectedResp = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${MEDIA_SITE_NAME}/staging/${MEDIA_DIRECTORY_NAME}/${encodeURIComponent(
        MEDIA_FILE_NAME
      )}`,
      name: MEDIA_FILE_NAME,
      sha: MEDIA_FILE_SHA,
      mediaPath: `${MEDIA_DIRECTORY_NAME}/${MEDIA_FILE_NAME}`,
      type: "file",
    }
    expect(await getMediaFileInfo(PDF_FILE_PRIVATE_INPUT)).toStrictEqual(
      expectedResp
    )
  })
})
