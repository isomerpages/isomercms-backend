const { NotFoundError } = require("@errors/NotFoundError")

const GitHubService = require('../db/GitHubService')

// Job is to deal with directory level operations to and from GitHub

const List = async ({ path }, { accessToken }) => {
    const resp = await GitHubService.Read({ accessToken, url: path })

    if (resp.status === 404) throw new NotFoundError("File does not exist")

    return { data: resp.data }
}

const Rename = async ({ oldDirectoryName, newDirectoryName, message }, reqDetails) => {
    const gitTree = await GitHubService.GetRepoState({ isRecursive: false }, reqDetails)

    const newGitTree = gitTree.map((item) => {
        if (item.path === oldDirectoryName) {
          return {
            ...item,
            path: newDirectoryName,
          }
        }
        return item
    })

    await GitHubService.UpdateRepoState({ gitTree: newGitTree, message }, reqDetails)
}

module.exports = {
    List,
    Rename,
}