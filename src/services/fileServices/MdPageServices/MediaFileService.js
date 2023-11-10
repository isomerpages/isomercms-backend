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
    if (isCloudmersiveEnabled(sessionData.growthbook)) {
      const virusScanRes = await scanFileForVirus(fileBuffer)
      logger.info(`File scan result: ${virusScanRes.CleanResult}`)
      if (!virusScanRes || !virusScanRes.CleanResult) {
        throw new BadRequestError("File did not pass virus scan")
      }
    }
    // Sanitize and validate file
    const sanitizedContent = await validateAndSanitizeFileUpload(content)
    if (!sanitizedContent) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }
    const { sha } = await this.repoService.create(sessionData, {
      content: sanitizedContent,
      fileName,
      directoryName,
      isMedia: true,
    })
    return { name: fileName, content, sha }
  }

  async read(sessionData, { fileName, directoryName }) {
    return this.repoService.readMediaFile(sessionData, {
      fileName,
      directoryName,
    })
  }

  async update(sessionData, { fileName, directoryName, content, sha }) {
    this.mediaNameChecks({ directoryName, fileName })
    const sanitizedContent = await validateAndSanitizeFileUpload(content)
    if (!sanitizedContent) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }
    await this.repoService.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })
    const { sha: newSha } = await this.repoService.create(sessionData, {
      content: sanitizedContent,
      fileName,
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
}

module.exports = { MediaFileService }
