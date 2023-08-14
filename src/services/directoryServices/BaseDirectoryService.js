const _ = require("lodash")

const { ConflictError } = require("@errors/ConflictError")

// Job is to deal with directory level operations to and from GitHub
class BaseDirectoryService {
  constructor({ repoService }) {
    this.repoService = repoService
  }

  async list(sessionData, { directoryName }) {
    const directoryData = await this.repoService.readDirectory(sessionData, {
      directoryName,
    })

    const filesOrDirs = directoryData.map((fileOrDir) => {
      const { name, path, sha, size, type } = fileOrDir
      return {
        name,
        path,
        sha,
        size,
        type,
      }
    })

    return _.compact(filesOrDirs)
  }

  async delete(sessionData, githubSessionData, { directoryName, message }) {
    await this.gitHubService.deleteDirectory(sessionData, {
      directoryName,
      message,
      githubSessionData,
    })
  }

  async rename(
    sessionData,
    githubSessionData,
    { oldDirectoryName, newDirectoryName, message }
  ) {
    await this.repoService.renameSinglePath(
      sessionData,
      githubSessionData,
      oldDirectoryName,
      newDirectoryName,
      message
    )
  }

  // Move files which do not require modification of content
  async moveFiles(
    sessionData,
    githubSessionData,
    { oldDirectoryName, newDirectoryName, targetFiles, message }
  ) {
    await this.repoService.moveFiles(
      sessionData,
      githubSessionData,
      oldDirectoryName,
      newDirectoryName,
      targetFiles,
      message
    )
  }
}

module.exports = { BaseDirectoryService }
