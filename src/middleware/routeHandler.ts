import { GrowthBook } from "@growthbook/growthbook"
import { BackoffOptions, backOff } from "exponential-backoff"
import { Request, Response, NextFunction } from "express"
import { ResultAsync } from "neverthrow"
import simpleGit from "simple-git"

import GithubSessionData from "@classes/GithubSessionData"

import { lock, unlock } from "@utils/mutex-utils"
import { getCommitAndTreeSha, revertCommit } from "@utils/utils.js"

import {
  MAX_CONCURRENT_GIT_PROCESSES,
  STAGING_BRANCH,
  STAGING_LITE_BRANCH,
} from "@constants/constants"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { FEATURE_FLAGS } from "@root/constants/featureFlags"
import LockedError from "@root/errors/LockedError"
import baseLogger from "@root/logger/logger"
import { FeatureFlags } from "@root/types/featureFlags"
import { RequestHandler } from "@root/types/request"
import convertNeverThrowToPromise from "@root/utils/neverthrow"
import GitFileSystemService from "@services/db/GitFileSystemService"

const logger = baseLogger.child({ module: "routeHandler" })

const backoffOptions: BackoffOptions = {
  numOfAttempts: 5,
}
const simpleGitInstance = simpleGit({
  maxConcurrentProcesses: MAX_CONCURRENT_GIT_PROCESSES,
})
const gitFileSystemService = new GitFileSystemService(simpleGitInstance)

const handleGitFileLock = async (repoName: string, next: NextFunction) => {
  const result = await gitFileSystemService.hasGitFileLock(repoName, true)
  if (result.isErr()) {
    next(result.error)
    return false
  }
  const isGitLocked = result.value
  if (isGitLocked) {
    const error = new LockedError(
      `Someone else is currently modifying repo ${repoName}. Please try again later.`
    )

    logger.error(`Failed to lock repo ${repoName}: git file system in use.`, {
      error,
      params: {
        repoName,
        isGitLocked,
      },
    })

    next(error)
    return false
  }
  return true
}

const isGitFileAndIsGitAvail = async (
  growthbook: GrowthBook<FeatureFlags>,
  siteName: string,
  next: NextFunction
) => {
  let isGitAvailable = true

  // only check git file lock if the repo is ggs enabled
  if (growthbook?.getFeatureValue(FEATURE_FLAGS.IS_GGS_ENABLED, false)) {
    isGitAvailable = await handleGitFileLock(siteName, next)
  }
  return isGitAvailable
}

type RouteWrapper<
  P = Record<string, unknown>,
  L extends Record<string, unknown> = Record<string, unknown>
> = <Params extends P, ResBody, ReqBody, ReqQuery, Locals extends L>(
  handler: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals>
) => (
  req: Request<Params, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => void

// Used when there are no write API calls to the repo on GitHub
export const attachReadRouteHandlerWrapper: RouteWrapper = (
  routeHandler
) => async (req, res, next) => {
  Promise.resolve(routeHandler(req, res, next)).catch((err: Error) => {
    next(err)
  })
}

// Used when there are write API calls to the repo on GitHub
export const attachWriteRouteHandlerWrapper: RouteWrapper<{
  siteName: string
}> = (routeHandler) => async (req, res, next) => {
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

  Promise.resolve(routeHandler(req, res, next)).catch(async (err: Error) => {
    await unlock(siteName)
    next(err)
  })

  try {
    await unlock(siteName)
  } catch (err) {
    next(err)
  }
}

export const attachRollbackRouteHandlerWrapper: RouteWrapper<
  {
    siteName: string
    directoryName: string
    fileName: string
  },
  {
    userWithSiteSessionData: UserWithSiteSessionData
    githubSessionData: GithubSessionData
  }
> = (routeHandler) => async (req, res, next: NextFunction) => {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params

  const { accessToken } = userWithSiteSessionData
  const { growthbook } = req

  if (!growthbook) {
    next(new Error("GrowthBook instance is undefined."))
    return
  }

  const isGitAvailable = await isGitFileAndIsGitAvail(
    growthbook,
    siteName,
    next
  )

  if (!isGitAvailable) return
  try {
    await lock(siteName)
  } catch (err) {
    next(err)
    return
  }

  let originalStagingCommitSha: string
  let originalStagingLiteCommitSha: string

  const shouldUseGitFileSystem = growthbook?.getFeatureValue(
    FEATURE_FLAGS.IS_GGS_ENABLED,
    false
  )
  const shouldCheckStagingLite = growthbook?.getFeatureValue(
    FEATURE_FLAGS.IS_BUILD_TIMES_REDUCTION_ENABLED,
    false
  )

  if (shouldUseGitFileSystem && shouldCheckStagingLite) {
    // ggs + quickie
    const results = await ResultAsync.combine([
      gitFileSystemService.getLatestCommitOfBranch(siteName, STAGING_BRANCH),
      gitFileSystemService.getLatestCommitOfBranch(
        siteName,
        STAGING_LITE_BRANCH
      ),
    ])

    if (results.isErr()) {
      await unlock(siteName)
      next(results.error)
      return
    }
    const [stagingResult, stagingLiteResult] = results.value
    if (!stagingResult.sha || !stagingLiteResult.sha) {
      await unlock(siteName)
      return
    }

    originalStagingCommitSha = stagingResult.sha
    originalStagingLiteCommitSha = stagingLiteResult.sha
    // Unused for git file system, but to maintain existing structure
    res.locals.githubSessionData = new GithubSessionData({
      currentCommitSha: "",
      treeSha: "",
    })
  } else if (shouldUseGitFileSystem && !shouldCheckStagingLite) {
    // ggs alone
    const result = await gitFileSystemService.getLatestCommitOfBranch(
      siteName,
      STAGING_BRANCH
    )

    if (result.isErr()) {
      await unlock(siteName)
      next(result.error)
      return
    }

    if (!result.value.sha) {
      await unlock(siteName)
      return
    }

    originalStagingCommitSha = result.value.sha
    // Unused for git file system, but to maintain existing structure
    res.locals.githubSessionData = new GithubSessionData({
      currentCommitSha: "",
      treeSha: "",
    })
  } else {
    // non-GGS flow
    try {
      const {
        currentCommitSha: currentStgCommitSha,
        treeSha: stgTreeSha,
      } = await getCommitAndTreeSha(siteName, accessToken, STAGING_BRANCH)

      const githubSessionData = new GithubSessionData({
        currentCommitSha: currentStgCommitSha,
        treeSha: stgTreeSha,
      })
      res.locals.githubSessionData = githubSessionData

      originalStagingCommitSha = currentStgCommitSha
    } catch (err) {
      await unlock(siteName)
      logger.error(`Failed to rollback repo ${siteName}`, {
        error: err,
        params: userWithSiteSessionData.getLogMeta(),
      })
      next(err)
      return
    }
  }

  Promise.resolve(routeHandler(req, res, next)).catch(async (err: Error) => {
    try {
      if (shouldUseGitFileSystem) {
        await backOff(
          () =>
            convertNeverThrowToPromise(
              gitFileSystemService.rollback(
                siteName,
                originalStagingCommitSha,
                STAGING_BRANCH
              )
            ),
          backoffOptions
        )

        if (shouldCheckStagingLite) {
          // for quickie sites
          await backOff(
            () =>
              convertNeverThrowToPromise(
                gitFileSystemService.rollback(
                  siteName,
                  originalStagingLiteCommitSha,
                  STAGING_LITE_BRANCH
                )
              ),
            backoffOptions
          )
        }

        await backOff(() => {
          let pushRes = gitFileSystemService.push(
            siteName,
            STAGING_BRANCH,
            true
          )
          if (originalStagingLiteCommitSha) {
            pushRes = pushRes.andThen(() =>
              gitFileSystemService.push(siteName, STAGING_LITE_BRANCH, true)
            )
          }

          return convertNeverThrowToPromise(pushRes)
        }, backoffOptions)
      } else {
        // Github flow
        await backOff(
          () =>
            revertCommit(
              originalStagingCommitSha,
              siteName,
              accessToken,
              STAGING_BRANCH
            ),
          backoffOptions
        )
      }
    } catch (retryErr) {
      await unlock(siteName)
      logger.error(`Failed to rollback repo ${siteName}`, {
        params: userWithSiteSessionData.getLogMeta(),
        error: retryErr,
      })
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
