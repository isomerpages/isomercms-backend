const { BadRequestError } = require("@errors/BadRequestError")
const { MediaTypeError } = require("@errors/MediaTypeError")

const { GITHUB_ORG_NAME } = process.env

const { validateAndSanitizeFileUpload } = require("@utils/file-upload-utils")

const { isMediaPathValid } = require("@validators/validators")

class MediaFileService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  mediaNameChecks({ directoryName, fileName }) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media path")
    if (!isMediaPathValid({ path: fileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
  }

  async create(reqDetails, { fileName, directoryName, content }) {
    this.mediaNameChecks({ directoryName, fileName })
    const sanitizedContent = await validateAndSanitizeFileUpload(content)
    if (!sanitizedContent) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }
    const { sha } = await this.gitHubService.create(reqDetails, {
      content: sanitizedContent,
      fileName,
      directoryName,
      isMedia: true,
    })
    return { fileName, content: sanitizedContent, sha }
  }

  async read(reqDetails, { fileName, directoryName, mediaType }) {
    const { siteName } = reqDetails
    const { sha } = await this.gitHubService.read(reqDetails, {
      fileName,
      directoryName,
    })
    const { private: isPrivate } = await this.gitHubService.getRepoInfo(
      reqDetails
    )
    const fileData = {
      mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${fileName}${
        fileName.endsWith(".svg") ? "?sanitize=true" : ""
      }`,
      name: fileName,
      sha,
    }
    if (mediaType === "images" && isPrivate) {
      // Generate blob url
      const imageExt = fileName.slice(fileName.lastIndexOf(".") + 1)
      const contentType = `image/${imageExt === "svg" ? "svg+xml" : imageExt}`
      const { content } = await this.gitHubService.readMedia(reqDetails, {
        fileSha: sha,
      })
      const blobURL = `data:${contentType};base64,${content}`
      fileData.mediaUrl = blobURL
    }
    return fileData
  }

  async update(reqDetails, { fileName, directoryName, content, sha }) {
    this.mediaNameChecks({ directoryName, fileName })
    const sanitizedContent = await validateAndSanitizeFileUpload(content)
    if (!sanitizedContent) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: sanitizedContent,
      sha,
      fileName,
      directoryName,
    })
    return {
      fileName,
      content: sanitizedContent,
      oldSha: sha,
      newSha,
    }
  }

  async delete(reqDetails, { fileName, directoryName, sha }) {
    this.mediaNameChecks({ directoryName, fileName })
    return this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName,
    })
  }

  async rename(
    reqDetails,
    { oldFileName, newFileName, directoryName, content, sha }
  ) {
    this.mediaNameChecks({ directoryName, fileName: oldFileName })
    this.mediaNameChecks({ directoryName, fileName: newFileName })

    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName,
    })

    const { sha: newSha } = await this.gitHubService.create(reqDetails, {
      content,
      fileName: newFileName,
      directoryName,
    })
    return {
      fileName: newFileName,
      content,
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { MediaFileService }
