const { BadRequestError } = require("@errors/BadRequestError")

const { isMediaPathValid } = require("@validators/validators")

const PLACEHOLDER_FILE_NAME = ".keep"

class MediaDirectoryService {
  constructor({ baseDirectoryService, gitHubService }) {
    this.baseDirectoryService = baseDirectoryService
    this.gitHubService = gitHubService
  }

  /**
   * Lists files in directory. Returns empty array if directory does not exist
   * - useful for base media directories which do not have placeholder files
   */
  async listWithDefault(sessionData, { directoryName }) {
    let files = []
    try {
      const retrievedFiles = await this.baseDirectoryService.list(sessionData, {
        directoryName,
      })
      files = retrievedFiles
    } catch (error) {
      // return an empty list if directory does not exist
      if (error.status !== 404) throw error
    }
    return files
  }

  async listMediaDirectoryContent(
    sessionData,
    { directoryName, page, limit, search }
  ) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media folder name")

    return this.gitHubService.readMediaDirectory(
      sessionData,
      directoryName,
      page,
      limit,
      search
    )
  }

  async createMediaDirectory(
    sessionData,
    githubSessionData,
    { directoryName, objArray }
  ) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    if (directoryName === "images" || directoryName === "files") {
      throw new BadRequestError("Cannot create root media directory")
    }

    if (objArray && objArray.length !== 0) {
      // We can't perform these operations concurrently because of conflict issues
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      const pathTokens = directoryName.split("/")
      const oldDirectoryName = pathTokens.slice(0, -1).join("/")
      const targetFiles = objArray.map((file) => file.name)
      await this.baseDirectoryService.moveFiles(
        sessionData,
        githubSessionData,
        {
          oldDirectoryName,
          newDirectoryName: directoryName,
          targetFiles,
          message: `Moving media files from ${oldDirectoryName} to ${directoryName}`,
        }
      )
    }

    // We do this step later because the git tree operation overrides it otherwise
    await this.gitHubService.create(sessionData, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName,
    })

    return {
      newDirectoryName: directoryName,
    }
  }

  async renameMediaDirectory(
    sessionData,
    githubSessionData,
    { directoryName, newDirectoryName }
  ) {
    if (!isMediaPathValid({ path: newDirectoryName }))
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    await this.baseDirectoryService.rename(sessionData, githubSessionData, {
      oldDirectoryName: directoryName,
      newDirectoryName,
      message: `Renaming media folder ${directoryName} to ${newDirectoryName}`,
    })
  }

  async deleteMediaDirectory(
    sessionData,
    githubSessionData,
    { directoryName }
  ) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media folder name")
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName,
      message: `Deleting media folder ${directoryName}`,
    })
  }

  async moveMediaFiles(
    sessionData,
    githubSessionData,
    { directoryName, targetDirectoryName, objArray }
  ) {
    if (
      !isMediaPathValid({ path: directoryName }) ||
      !isMediaPathValid({ path: targetDirectoryName })
    )
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    const targetFiles = objArray.map((item) => item.name)

    await this.baseDirectoryService.moveFiles(sessionData, githubSessionData, {
      oldDirectoryName: directoryName,
      newDirectoryName: targetDirectoryName,
      targetFiles,
      message: `Moving media files from ${directoryName} to ${targetDirectoryName}`,
    })
  }
}

module.exports = { MediaDirectoryService }
