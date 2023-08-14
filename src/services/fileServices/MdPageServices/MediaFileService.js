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
    const virusScanRes = await scanFileForVirus(fileBuffer)
    logger.info(`File scan result: ${virusScanRes.CleanResult}`)
    if (!virusScanRes || !virusScanRes.CleanResult) {
      throw new BadRequestError("File did not pass virus scan")
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
    return this.gitHubService.readMediaFile(sessionData, {
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

    const gitTree = await this.gitHubService.getTree(
      sessionData,
      githubSessionData,
      {
        isRecursive: true,
      }
    )
    const newGitTree = []
    gitTree.forEach((item) => {
      if (item.path.startsWith(`${directoryName}/`) && item.type !== "tree") {
        const fileName = item.path.split(`${directoryName}/`)[1]
        if (fileName === oldFileName) {
          // Delete old file
          newGitTree.push({
            ...item,
            sha: null,
          })
          // Add file to target directory
          newGitTree.push({
            ...item,
            path: `${directoryName}/${newFileName}`,
          })
        }
      }
    })

    const newCommitSha = await this.gitHubService.updateTree(
      sessionData,
      githubSessionData,
      {
        gitTree: newGitTree,
        message: `Renamed ${oldFileName} to ${newFileName}`,
      }
    )
    await this.gitHubService.updateRepoState(sessionData, {
      commitSha: newCommitSha,
    })

    return {
      name: newFileName,
      oldSha: sha,
      sha,
    }
  }
}

module.exports = { MediaFileService }
