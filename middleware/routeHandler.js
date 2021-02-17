const { backOff } = require('exponential-backoff')
const { lock, unlock } = require('../utils/mutex-utils')

const { getCommitAndTreeSha, revertCommit } = require('../utils/utils.js')

const attachRouteHandlerWrapper = (routeHandler) => async (req, res, next) => {
  routeHandler(req, res).catch((err) => {
    next(err)
  })
}

const attachRollbackRouteHandlerWrapper = (routeHandler) => async (req, res, next) => {
  const { accessToken } = req
  const { siteName } = req.params

  await lock(siteName)

  let originalCommitSha
  try {
    const { currentCommitSha } = await getCommitAndTreeSha(siteName, accessToken)
    originalCommitSha = currentCommitSha
  } catch (err) {
    await unlock(siteName)
    next(err)
  }
  routeHandler(req, res).catch(async (err) => {
    try {
      await backOff(() => revertCommit(originalCommitSha, siteName, accessToken))
    } catch (retryErr) {
      await unlock(siteName)
      next(retryErr)
    }
    await unlock(siteName)
    next(err)
  })
}
  
module.exports = {
  attachRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
}