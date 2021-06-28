const _ = require("lodash")

const GitHubService = require("../db/GitHubService")

// Job is to deal with directory level operations to and from GitHub

const List = async (reqDetails, { directoryName }) => {
  const directoryData = await GitHubService.ReadDirectory(reqDetails, {
    directoryName,
  })

  const filesOrDirs = directoryData.map((fileOrDir) => {
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

const Rename = async (
  reqDetails,
  { oldDirectoryName, newDirectoryName, message }
) => {
  const gitTree = await GitHubService.GetTree(reqDetails, { isRecursive: true })

  const newGitTree = []

  gitTree.forEach((item) => {
    if (item.path === oldDirectoryName) {
      newGitTree.push({
        ...item,
        path: newDirectoryName,
      })
    } else if (
      item.type !== "tree" &&
      !item.path.includes(`${oldDirectoryName}/`)
    ) {
      // We don't include any other trees - we reconstruct them by adding all their individual files instead
      // Files which are children of the renamed tree are covered by adding the renamed tree
      newGitTree.push(item)
    }
  })

  const newCommitSha = await GitHubService.UpdateTree(reqDetails, {
    gitTree: newGitTree,
    message,
  })
  await GitHubService.UpdateRepoState(reqDetails, { commitSha: newCommitSha })
}

const Delete = async (reqDetails, { directoryName, message }) => {
  const gitTree = await GitHubService.GetTree(reqDetails, { isRecursive: true })

  const newGitTree = gitTree.filter(
    (item) => !(item.path.includes(`${directoryName}/`) || item.type === "tree")
  )

  const newCommitSha = await GitHubService.UpdateTree(reqDetails, {
    gitTree: newGitTree,
    message,
  })
  await GitHubService.UpdateRepoState(reqDetails, { commitSha: newCommitSha })
}

module.exports = {
  List,
  Rename,
  Delete,
}
