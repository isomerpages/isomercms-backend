const logger = require("@logger/logger").default

const { BadRequestError } = require("@errors/BadRequestError")
const { MediaTypeError } = require("@errors/MediaTypeError")

const {
  validateAndSanitizeFileUpload,
  ALLOWED_FILE_EXTENSIONS,
  scanFileForVirus,
} = require("@utils/file-upload-utils")

const { isMediaPathValid } = require("@validators/validators")

const { getFileExt } = require("@root/utils/files")
const { isCloudmersiveEnabled } = require("@root/utils/growthbook-utils")

class MediaFileService {
  constructor({ repoService }) {
    this.repoService = repoService
  }

  mediaNameChecks({ directoryName, fileName }) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media path")
    if (!isMediaPathValid({ path: fileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
  }

  async create(sessionData, { fileName, directoryName, content }) {
    this.mediaNameChecks({ directoryName, fileName })

    const [, fileContent] = content.split(",")
    const fileBuffer = Buffer.from(fileContent, "base64")

    // Scan file for virus - cloudmersive API
    const cmConfig = isCloudmersiveEnabled(sessionData.growthbook)
    if (cmConfig.is_enabled) {
      const virusScanRes = await scanFileForVirus(fileBuffer, cmConfig.timeout)
      logger.info({
        message: "File scan result",
        meta: {
          virusScanRes,
        },
      })
      if (!virusScanRes || !virusScanRes.CleanResult) {
        throw new BadRequestError("File did not pass virus scan")
      }
    }

    // Sanitize and validate file
    const sanitisationResult = await validateAndSanitizeFileUpload(content)
    if (!sanitisationResult) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }

    const {
      content: sanitizedContent,
      detectedFileType: { ext },
    } = sanitisationResult
    // NOTE: We construct the extension based off what we detect as the file type
    const constructedFileName = `${fileName
      .split(".")
      .slice(0, -1)
      .join(".")}.${ext}`

    const { sha } = await this.repoService.create(sessionData, {
      content: sanitizedContent,
      fileName: constructedFileName,
      directoryName,
      isMedia: true,
    })

    return { name: constructedFileName, content, sha }
  }

  async read(sessionData, { fileName, directoryName }) {
    return this.repoService.readMediaFile(sessionData, {
      fileName,
      directoryName,
    })
  }

  async update(sessionData, { fileName, directoryName, content, sha }) {
    this.mediaNameChecks({ directoryName, fileName })
    const sanitisationResult = await validateAndSanitizeFileUpload(content)
    if (!sanitisationResult) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }
    const {
      content: sanitizedContent,
      detectedFileType: { ext },
    } = sanitisationResult

    // NOTE: We can trust the user input here
    // as we are removing stuff from our system.
    await this.repoService.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })
    const { sha: newSha } = await this.repoService.create(sessionData, {
      content: sanitizedContent,
      fileName: `${fileName.split(".").slice(0, -1).join(".")}.${ext}`,
      directoryName,
      isMedia: true,
    })
    return {
      name: fileName,
      content,
      oldSha: sha,
      newSha,
    }
  }

  async delete(sessionData, { fileName, directoryName, sha }) {
    this.mediaNameChecks({ directoryName, fileName })
    return this.repoService.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })
  }

  async rename(
    sessionData,
    githubSessionData,
    { oldFileName, newFileName, directoryName, sha }
  ) {
    this.mediaNameChecks({ directoryName, fileName: newFileName })
    const oldExt = getFileExt(oldFileName)
    const newExt = getFileExt(newFileName)

    if (oldExt !== newExt) {
      throw new BadRequestError(
        "Please ensure that the file extension stays the same when renaming!"
      )
    }

    if (!ALLOWED_FILE_EXTENSIONS.includes(oldExt)) {
      throw new BadRequestError(
        "Please ensure that the file extension chosen is valid!"
      )
    }

    const { newSha: newCommitSha } = await this.repoService.renameSinglePath(
      sessionData,
      githubSessionData,
      `${directoryName}/${oldFileName}`,
      `${directoryName}/${newFileName}`,
      `Renamed ${oldFileName} to ${newFileName}`
    )

    return {
      name: newFileName,
      oldSha: sha,
      sha: newCommitSha,
    }
  }

  async deleteMultipleFiles(sessionData, githubSessionData, { items }) {
    items.forEach((item) => {
      const directoryName = item.filePath.split("/").slice(0, -1).join("/")
      const fileName = item.filePath.split("/").pop()

      this.mediaNameChecks({
        directoryName,
        fileName,
      })
    })

    return this.repoService.deleteMultipleFiles(
      sessionData,
      githubSessionData,
      { items }
    )
  }
}

module.exports = { MediaFileService }
