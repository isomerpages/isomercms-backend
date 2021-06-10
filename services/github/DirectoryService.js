const axios = require("axios")
const _ = require("lodash")

const { GITHUB_ORG_NAME } = process.env
const { BRANCH_REF } = process.env

const validateStatus = require("@utils/axios-utils")
const { getTree, sendTree } = require("@utils/utils.js")

class DirectoryService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async getEndpoint(folderPath) {
    return `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/${folderPath}`
  }

  async getContents(folderPath) {
    const endpoint = this.getEndpoint(folderPath)

    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    const filesOrDirs = resp.data.map((fileOrDir) => {
      const { name, path, sha, size, content, type } = fileOrDir
      return {
        name,
        path,
        sha,
        size,
        content,
        type,
      }
    })

    return _.compact(filesOrDirs)
  }

  async rename(folderPath, newFolderPath, currentCommitSha, treeSha) {
    const commitMessage = `Rename folder from ${folderPath} to ${newFolderPath}`

    const gitTree = await getTree(
      this.siteName,
      this.accessToken,
      treeSha,
      true
    )
    gitTree.forEach((item) => {
      if (item.path === folderPath) {
        newGitTree.push({
          ...item,
          path: newFolderPath,
        })
      } else if (item.type !== "tree" && !item.path.includes(folderPath)) {
        // We don't include any other trees - we reconstruct them by adding all their individual files instead
        // Files which are children of the renamed tree are covered by adding the renamed tree
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
  }

  async delete(folderPath, currentCommitSha, treeSha) {
    const commitMessage = `Delete folder ${folderPath}`
    const gitTree = await getTree(
      this.siteName,
      this.accessToken,
      treeSha,
      true
    )

    const newGitTree = gitTree
      .filter((item) => {
        return !item.path.includes(folderPath)
      })
      .filter((item) => {
        return item.type !== "tree"
      })
    await sendTree(
      newGitTree,
      currentCommitSha,
      this.siteName,
      this.accessToken,
      commitMessage
    )
  }
}

module.exports = {
  DirectoryService
}
