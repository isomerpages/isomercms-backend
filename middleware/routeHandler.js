const { backOff } = require('exponential-backoff')

const { getCommitAndTreeSha, revertCommit } = require('../utils/utils.js')

const attachRouteHandlerWrapper = (routeHandler) => async (req, res, next) => {
  routeHandler(req, res).catch((err) => {
    next(err)
  })
}

const attachRollbackRouteHandlerWrapper = (routeHandler) => async (req, res, next) => {
  const { accessToken } = req
  const { siteName } = req.params
  let originalCommitSha
  try {
    const { currentCommitSha } = await getCommitAndTreeSha(siteName, accessToken)
    originalCommitSha = currentCommitSha
  } catch (err) {
    next(err)
  }
  routeHandler(req, res).catch(async (err) => {
    try {
      await backOff(() => revertCommit(originalCommitSha, siteName, accessToken))
    } catch (err) {
      next(err)
    }
    next(err)
  })
}
  
module.exports = {
  attachRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
}