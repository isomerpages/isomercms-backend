const _ = require("lodash")

// Job is to deal with directory level operations to and from GitHub
class BaseDirectoryService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async list(reqDetails, { directoryName }) {
    const directoryData = await this.gitHubService.readDirectory(reqDetails, {
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

  async rename(reqDetails, { oldDirectoryName, newDirectoryName, message }) {
    const gitTree = await this.gitHubService.getTree(reqDetails, {
      isRecursive: true,
    })

    const newGitTree = []

    gitTree.forEach((item) => {
      if (item.path === oldDirectoryName && item.type === "tree") {
        // Rename old subdirectory to new name
        newGitTree.push({
          ...item,
          path: newDirectoryName,
        })
      } else if (
        item.path.startsWith(`${oldDirectoryName}/`) &&
        item.type !== "tree"
      ) {
        // Delete old files
        newGitTree.push({
          ...item,
          sha: null,
        })
      }
    })

    const newCommitSha = await this.gitHubService.updateTree(reqDetails, {
      gitTree: newGitTree,
      message,
    })
    await this.gitHubService.updateRepoState(reqDetails, {
      commitSha: newCommitSha,
    })
  }

  async delete(reqDetails, { directoryName, message }) {
    const gitTree = await this.gitHubService.getTree(reqDetails, {
      isRecursive: true,
    })

    // Retrieve removed items and set their sha to null
    const newGitTree = gitTree
      .filter(
        (item) =>
          item.path.startsWith(`${directoryName}/`) && item.type !== "tree"
      )
      .map((item) => ({
        ...item,
        sha: null,
      }))

    const newCommitSha = await this.gitHubService.updateTree(reqDetails, {
      gitTree: newGitTree,
      message,
    })
    await this.gitHubService.updateRepoState(reqDetails, {
      commitSha: newCommitSha,
    })
  }

  // Move files which do not require modification of content
  async moveFiles(
    reqDetails,
    { oldDirectoryName, newDirectoryName, targetFiles, message }
  ) {
    const gitTree = await this.gitHubService.getTree(reqDetails, {
      isRecursive: true,
    })

    const newGitTree = []

    gitTree.forEach((item) => {
      if (
        item.path.startsWith(`${oldDirectoryName}/`) &&
        item.type !== "tree"
      ) {
        const fileName = item.path.split(`${oldDirectoryName}/`)[1]
        if (targetFiles.includes(fileName)) {
          // Add file to target directory
          newGitTree.push({
            ...item,
            path: `${newDirectoryName}/${fileName}`,
          })
          // Delete old file
          newGitTree.push({
            ...item,
            sha: null,
          })
        }
      }
    })

    const newCommitSha = await this.gitHubService.updateTree(reqDetails, {
      gitTree: newGitTree,
      message,
    })
    await this.gitHubService.updateRepoState(reqDetails, {
      commitSha: newCommitSha,
    })
  }
}

module.exports = { BaseDirectoryService }
