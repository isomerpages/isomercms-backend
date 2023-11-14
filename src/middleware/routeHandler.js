const { backOff } = require("exponential-backoff")
const SimpleGit = require("simple-git")

const { config } = require("@config/config")

const logger = require("@logger/logger").default

const { default: GithubSessionData } = require("@classes/GithubSessionData")

const { lock, unlock } = require("@utils/mutex-utils")
const { getCommitAndTreeSha, revertCommit } = require("@utils/utils.js")

const {
  MAX_CONCURRENT_GIT_PROCESSES,
  STAGING_BRANCH,
  STAGING_LITE_BRANCH,
} = require("@constants/constants")

const { FEATURE_FLAGS } = require("@root/constants/featureFlags")
const GitFileSystemError = require("@root/errors/GitFileSystemError").default
const LockedError = require("@root/errors/LockedError").default
const {
  default: GitFileSystemService,
} = require("@services/db/GitFileSystemService")

const BRANCH_REF = config.get("github.branchRef")

const gitFileSystemService = new GitFileSystemService(
  new SimpleGit({ maxConcurrentProcesses: MAX_CONCURRENT_GIT_PROCESSES })
)

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

  let isGitAvailable = true

  // only check git file lock if the repo is ggs enabled
  if (growthbook?.getFeatureValue(FEATURE_FLAGS.IS_GGS_ENABLED, false)) {
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

  const shouldUseGitFileSystem = !!growthbook?.getFeatureValue(
    FEATURE_FLAGS.IS_GGS_ENABLED,
    false
  )

  const isGitAvailable = await handleGitFileLock(siteName, next)
  if (!isGitAvailable) return
  try {
    await lock(siteName)
  } catch (err) {
    next(err)
    return
  }

  let originalStagingCommitSha
  let originalStagingLiteCommitSha

  if (shouldUseGitFileSystem) {
    const results = await Promise.all([
      gitFileSystemService.getLatestCommitOfBranch(siteName, STAGING_BRANCH),
      gitFileSystemService.getLatestCommitOfBranch(
        siteName,
        STAGING_LITE_BRANCH
      ),
    ])
    const [stgResult, stgLiteResult] = results

    if (stgResult.isErr() || stgLiteResult.isErr()) {
      await unlock(siteName)
      next(stgResult.err)
      return
    }
    originalStagingCommitSha = stgResult.value.sha
    originalStagingLiteCommitSha = stgLiteResult.value.sha
    if (!originalStagingCommitSha || !originalStagingLiteCommitSha) {
      await unlock(siteName)
      next(stgResult.err)
      return
    }
    // Unused for git file system, but to maintain existing structure
    res.locals.githubSessionData = new GithubSessionData({
      currentCommitSha: "",
      treeSha: "",
    })
  } else {
    try {
      const {
        currentCommitSha: currentStgCommitSha,
        treeSha: stgTreeSha,
      } = await getCommitAndTreeSha(siteName, accessToken)

      const {
        currentCommitSha: currentStgLiteCommitSha,
      } = await getCommitAndTreeSha(siteName, accessToken)

      const githubSessionData = new GithubSessionData({
        currentCommitSha: currentStgCommitSha,
        treeSha: stgTreeSha,
      })
      res.locals.githubSessionData = githubSessionData

      originalStagingCommitSha = currentStgCommitSha
      originalStagingLiteCommitSha = currentStgLiteCommitSha
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
            .rollback(siteName, originalStagingCommitSha, STAGING_BRANCH)
            .rollback(
              siteName,
              originalStagingLiteCommitSha,
              STAGING_LITE_BRANCH
            )
            .unwrapOr(false)
          if (!rollbackRes) throw new GitFileSystemError("Rollback failure")
        })
        await backOff(() => {
          let pushRes = gitFileSystemService.push(
            siteName,
            STAGING_BRANCH,
            true
          )
          if (originalStagingLiteCommitSha) {
            pushRes = pushRes.push(siteName, STAGING_LITE_BRANCH, true)
          }

          pushRes = pushRes.unwrapOr(false)
          if (!pushRes) throw new GitFileSystemError("Push failure")
        })
      } else {
        await backOff(() => {
          revertCommit(
            originalStagingCommitSha,
            siteName,
            accessToken,
            STAGING_BRANCH
          )
          revertCommit(
            originalStagingLiteCommitSha,
            siteName,
            accessToken,
            STAGING_LITE_BRANCH
          )
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
