const _ = require('lodash')

const { File, ImageType } = require('./File.js')
const { getTree, sendTree } = require('../utils/utils.js')

class MediaSubfolder {
  constructor(accessToken, siteName, fileType) {
    this.accessToken = accessToken
    this.siteName = siteName
    switch (fileType) {
      case 'images':
        this.fileType = new ImageType()
      default:
        this.fileType = new ImageType()
    }
    this.mediaFolderName = fileType
  }

  async create(subfolderPath) {
    try {
      const IsomerFile = new File(this.accessToken, this.siteName)
      IsomerFile.setFileType(this.fileType)
      await IsomerFile.create(`${subfolderPath}/.keep`, '')
    } catch (err) {
      throw err
    }
  }

  async delete(subfolderPath, currentCommitSha, treeSha) {
    try {
      const commitMessage = `Delete ${this.mediaFolderName} subfolder ${subfolderPath}`
      const gitTree = await getTree(this.siteName, this.accessToken, treeSha)

      const newGitTree = gitTree.filter(item => {
        if (item.path !== `${this.mediaFolderName}/${subfolderPath}`) return item
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage)
    } catch (err) {
      throw err
    }
  }

  async rename(oldSubfolderPath, newSubfolderPath, currentCommitSha, treeSha) {
    try {
      const commitMessage = `Rename ${this.mediaFolderName} subfolder from ${oldSubfolderPath} to ${newSubfolderPath}`

      const gitTree = await getTree(this.siteName, this.accessToken, treeSha);
      const oldDirectoryName = `${this.mediaFolderName}/${oldSubfolderPath}`
      const newDirectoryName = `${this.mediaFolderName}/${newSubfolderPath}`
      const newGitTree = gitTree.map(item => {
        if (item.path === oldDirectoryName) {
          return {
            ...item,
            path: newDirectoryName
          }
        } else {
          return item
        }
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage);
    } catch (err) {
      throw err
    }
  }
}

module.exports = { MediaSubfolder }