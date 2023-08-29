const { backOff } = require("exponential-backoff")
const SimpleGit = require("simple-git")

const { config } = require("@config/config")

const { default: GithubSessionData } = require("@classes/GithubSessionData")

const { lock, unlock } = require("@utils/mutex-utils")
const { getCommitAndTreeSha, revertCommit } = require("@utils/utils.js")

const GitFileSystemError = require("@root/errors/GitFileSystemError").default
const LockedError = require("@root/errors/LockedError").default
const {
  default: GitFileSystemService,
} = require("@services/db/GitFileSystemService")

const logger = require("@logger/logger").default

const BRANCH_REF = config.get("github.branchRef")

const gitFileSystemService = new GitFileSystemService(new SimpleGit())

const isRepoWhitelisted = (siteName, ggsWhitelistedRepos) =>
  ggsWhitelistedRepos.includes(siteName)

const handleGitFileLock = async (repoName, next) => {
  const result = await gitFileSystemService.hasGitFileLock(repoName)
  if (result.isErr()) {
    next(result.err)
    return false
  }
  const isGitLocked = result.value
  if (isGitLocked) {
    logger.error(`Failed to lock repo ${repoName}: git file system in use.`)
    next(
      new LockedError(
        `Someone else is currently modifying repo ${repoName}. Please try again later.`
      )
    )
    return false
  }
  return true
}

// Used when there are no write API calls to the repo on GitHub
const attachReadRouteHandlerWrapper = (routeHandler) => async (
  req,
  res,
  next
) => {
  routeHandler(req, res).catch((err) => {
    next(err)
  })
}

// Used when there are write API calls to the repo on GitHub
const attachWriteRouteHandlerWrapper = (routeHandler) => async (
  req,
  res,
  next
) => {
  const { siteName } = req.params
  const { growthbook } = req

  let ggsWhitelistedRepos = { repos: [] }
  if (growthbook) {
    ggsWhitelistedRepos = growthbook.getFeatureValue("ggs_whitelisted_repos", {
      repos: [],
    })
  }

  let isGitAvailable = false
  if (!isRepoWhitelisted(siteName, ggsWhitelistedRepos.repos)) {
    isGitAvailable = true
  } else {
    isGitAvailable = await handleGitFileLock(siteName, next)
  }

  if (!isGitAvailable) return
  try {
    await lock(siteName)
  } catch (err) {
    next(err)
    return
  }

  await routeHandler(req, res, next).catch(async (err) => {
    await unlock(siteName)
    next(err)
  })
  try {
    await unlock(siteName)
  } catch (err) {
    next(err)
  }
}

const attachRollbackRouteHandlerWrapper = (routeHandler) => async (
  req,
  res,
  next
) => {
  const { userSessionData } = res.locals
  const { siteName } = req.params

  const { accessToken } = userSessionData
  const { growthbook } = req

  let ggsWhitelistedRepos = { repos: [] }
  if (growthbook) {
    ggsWhitelistedRepos = growthbook.getFeatureValue("ggs_whitelisted_repos", {
      repos: [],
    })
  }

  const shouldUseGitFileSystem = isRepoWhitelisted(
    siteName,
    ggsWhitelistedRepos.repos
  )

  const isGitAvailable = await handleGitFileLock(siteName, next)
  if (!isGitAvailable) return
  try {
    await lock(siteName)
  } catch (err) {
    next(err)
    return
  }

  let originalCommitSha
  if (shouldUseGitFileSystem) {
    const result = await gitFileSystemService.getLatestCommitOfBranch(
      siteName,
      BRANCH_REF
    )
    if (result.isErr()) {
      await unlock(siteName)
      next(result.err)
      return
    }
    originalCommitSha = result.value.sha
    if (!originalCommitSha) {
      await unlock(siteName)
      next(result.err)
      return
    }
    // Unused for git file system, but to maintain existing structure
    res.locals.githubSessionData = new GithubSessionData({
      currentCommitSha: "",
      treeSha: "",
    })
  } else {
    try {
      const { currentCommitSha, treeSha } = await getCommitAndTreeSha(
        siteName,
        accessToken
      )

      const githubSessionData = new GithubSessionData({
        currentCommitSha,
        treeSha,
      })
      res.locals.githubSessionData = githubSessionData

      originalCommitSha = currentCommitSha
    } catch (err) {
      await unlock(siteName)
      next(err)
      return
    }
  }
  await routeHandler(req, res, next).catch(async (err) => {
    try {
      if (shouldUseGitFileSystem) {
        await backOff(() => {
          const rollbackRes = gitFileSystemService
            .rollback(siteName, originalCommitSha)
            .unwrapOr(false)
          if (!rollbackRes) throw new GitFileSystemError("Rollback failure")
        })
        await backOff(() => {
          const pushRes = gitFileSystemService
            .push(siteName, true)
            .unwrapOr(false)
          if (!pushRes) throw new GitFileSystemError("Push failure")
        })
      } else {
        await backOff(() => {
          revertCommit(originalCommitSha, siteName, accessToken)
        })
      }
    } catch (retryErr) {
      await unlock(siteName)
      next(retryErr)
      return
    }
    await unlock(siteName)
    next(err)
  })

  try {
    await unlock(siteName)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
}
