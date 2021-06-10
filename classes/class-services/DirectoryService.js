import GitHubService from "./GitHubService"

const { BadRequestError } = require("@errors/BadRequestError")
const { NotFoundError } = require("@errors/NotFoundError")

const {
  getTree,
  sendTree,
} = require("@utils/utils.js")

class DirectoryService {
  /**
   *
   * @param accessToken {string}
   * @param siteName {string}
   * @param dirPath {string}
   */
  constructor(accessToken, siteName, dirPath) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.dirPath = dirPath
  }

  /**
   * List all items in a directory
   * @returns {Promise<Array|*|{}>}
   */
  async list() {
    const resp = await GitHubService.list(this.accessToken, this.siteName, this.dirPath)

    if (resp.status !== 200) {
      if (this.dirPath) {
        if (resp.status === 404)
          throw new NotFoundError(
            `Path ${this.dirPath} was not found!`
          )
        throw new BadRequestError(
          `Path ${this.dirPath} was invalid!`
        )
      }
      return {}
    }

    if (this.dirPath) {
      // Validation
      if (!Array.isArray(resp.data)) {
        throw new BadRequestError(
          `The provided path, ${this.dirPath}, is not a directory`
        )
      }
    }

    return resp.data
  }

  /**
   *
   * @param currentCommitSha
   * @param treeSha
   * @returns {Promise<void>}
   */
  async delete(currentCommitSha, treeSha) {
    const dirPath = this.dirPath.charAt(this.dirPath.length) === '/' ? this.dirPath.slice(0, -1) : this.dirPath
    const commitMessage = `Delete folder ${dirPath}`
    const gitTree = await getTree(this.siteName, this.accessToken, treeSha, true)

    const newGitTree = gitTree.filter((item) => {
      return !item.path.startsWith(dirPath)
    }).filter((item) => {
      return !(
        item.type === "tree" && item.path.startsWith(dirPath)
      )
    })

    await sendTree(
      newGitTree,
      currentCommitSha,
      this.siteName,
      this.accessToken,
      commitMessage
    )
  }

  /**
   *
   * @param newDirPath
   * @param currentCommitSha
   * @param treeSha
   * @returns {Promise<void>}
   */
  async update(newDirPath, currentCommitSha, treeSha) {
    const oldDirPath = this.dirPath.charAt(this.dirPath.length) === '/' ? this.dirPath.slice(0, -1) : this.dirPath
    const updatedDirPath = newDirPath.charAt(newDirPath) === '/' ? newDirPath.slice(0, -1) : newDirPath
    const commitMessage = `Rename folder ${oldDirPath} to ${newDirPath}`
    const gitTree = await getTree(this.siteName, this.accessToken, treeSha, true)

    const newGitTree = []
    gitTree.forEach((item) => {
      if (item.path === oldDirPath) {
        newGitTree.push({
          ...item,
          path: updatedDirPath,
        })
      } else if (item.path.startsWith(oldDirPath)) {
        // We don't want to include these because they use the old path, they are included with the renamed tree
      } else if (
        item.type === "tree"
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
  }
}

export default DirectoryService