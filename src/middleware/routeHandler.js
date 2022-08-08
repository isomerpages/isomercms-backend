const { backOff } = require("exponential-backoff")

const { lock, unlock } = require("@utils/mutex-utils")
const { getCommitAndTreeSha, revertCommit } = require("@utils/utils.js")

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
  await lock(siteName)
  routeHandler(req, res).catch(async (err) => {
    await unlock(siteName)
    next(err)
  })
  await unlock(siteName)
}

const attachRollbackRouteHandlerWrapper = (routeHandler) => async (
  req,
  res,
  next
) => {
  const { sessionData } = res.locals
  const { siteName } = req.params

  const { accessToken } = sessionData

  await lock(siteName)

  let originalCommitSha
  try {
    const { currentCommitSha, treeSha } = await getCommitAndTreeSha(
      siteName,
      accessToken
    )

    sessionData.addGithubState({
      currentCommitSha,
      treeSha,
    })

    originalCommitSha = currentCommitSha
  } catch (err) {
    await unlock(siteName)
    next(err)
  }
  routeHandler(req, res).catch(async (err) => {
    try {
      await backOff(() =>
        revertCommit(originalCommitSha, siteName, accessToken)
      )
    } catch (retryErr) {
      await unlock(siteName)
      next(retryErr)
    }
    await unlock(siteName)
    next(err)
  })

  await unlock(siteName)
}

module.exports = {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
}
