const _ = require("lodash")

const { File, ImageType, DocumentType } = require("./File.js")
const { getTree, sendTree } = require("../utils/utils.js")

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
    try {
      const IsomerFile = new File(this.accessToken, this.siteName)
      IsomerFile.setFileType(this.fileType)
      await IsomerFile.create(`${subfolderPath}/.keep`, "")
    } catch (err) {
      throw err
    }
  }

  async delete(subfolderPath, currentCommitSha, treeSha) {
    try {
      const commitMessage = `Delete ${this.mediaFolderName} subfolder ${subfolderPath}`
      const gitTree = await getTree(
        this.siteName,
        this.accessToken,
        treeSha,
        true
      )
      const directoryName = `${this.mediaFolderName}/${subfolderPath}`
      const newGitTree = []
      gitTree.forEach((item) => {
        if (item.path.includes(directoryName)) {
        } else if (
          item.type === "tree" &&
          item.path.includes(this.mediaFolderName)
        ) {
          // We don't include any trees in the media folder - we reconstruct them by adding all their individual files instead
        } else {
          newGitTree.push(item)
        }
      })
      await sendTree(
        newGitTree,
        currentCommitSha,
        this.siteName,
        this.accessToken,
        commitMessage
      )
    } catch (err) {
      throw err
    }
  }

  async rename(oldSubfolderPath, newSubfolderPath, currentCommitSha, treeSha) {
    try {
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
        if (item.path === oldDirectoryName) {
          newGitTree.push({
            ...item,
            path: newDirectoryName,
          })
        } else if (item.path.includes(oldDirectoryName)) {
          // We don't want to include these because they use the old path, they are included with the renamed tree
        } else if (
          item.type === "tree" &&
          item.path.includes(this.mediaFolderName)
        ) {
          // We don't include any other trees - we reconstruct them by adding all their individual files instead
        } else {
          newGitTree.push(item)
        }
      })
      await sendTree(
        newGitTree,
        currentCommitSha,
        this.siteName,
        this.accessToken,
        commitMessage
      )
    } catch (err) {
      throw err
    }
  }
}

module.exports = { MediaSubfolder }
