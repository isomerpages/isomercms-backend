const { File, ImageType, DocumentType } = require("@classes/File.js")

const { getTree, sendTree } = require("@utils/utils.js")

class MediaSubfolder {
  constructor(accessToken, siteName, fileType) {
    this.accessToken = accessToken
    this.siteName = siteName
    switch (fileType) {
      case "images":
        this.fileType = new ImageType()
        this.mediaFolderName = fileType
        break
      case "documents":
        this.fileType = new DocumentType()
        this.mediaFolderName = "files"
        break
      default:
        throw new Error("Invalid media type!")
    }
  }

  async create(subfolderPath) {
    const IsomerFile = new File(this.accessToken, this.siteName)
    IsomerFile.setFileType(this.fileType)
    await IsomerFile.create(`${subfolderPath}/.keep`, "")
  }

  async delete(subfolderPath, currentCommitSha, treeSha) {
    const commitMessage = `Delete ${this.mediaFolderName} subfolder ${subfolderPath}`
    const gitTree = await getTree(
      this.siteName,
      this.accessToken,
      treeSha,
      true
    )
    const directoryName = `${this.mediaFolderName}/${subfolderPath}`
    const newGitTree = gitTree
      .filter(
        (item) =>
          item.type !== "tree" && item.path.startsWith(`${directoryName}/`)
      )
      .map((item) => ({
        ...item,
        sha: null,
      }))
    await sendTree(
      newGitTree,
      treeSha,
      currentCommitSha,
      this.siteName,
      this.accessToken,
      commitMessage
    )
  }

  async rename(oldSubfolderPath, newSubfolderPath, currentCommitSha, treeSha) {
    const commitMessage = `Rename ${this.mediaFolderName} subfolder from ${oldSubfolderPath} to ${newSubfolderPath}`

    const gitTree = await getTree(
      this.siteName,
      this.accessToken,
      treeSha,
      true
    )
    const oldDirectoryName = `${this.mediaFolderName}/${oldSubfolderPath}`
    const newDirectoryName = `${this.mediaFolderName}/${newSubfolderPath}`
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
        // Delete old subdirectory items
        newGitTree.push({
          ...item,
          sha: null,
        })
      }
    })
    await sendTree(
      newGitTree,
      treeSha,
      currentCommitSha,
      this.siteName,
      this.accessToken,
      commitMessage
    )
  }
}

module.exports = { MediaSubfolder }
