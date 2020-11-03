const attachRouteHandlerWrapper = (routeHandler) => async (req, res, next) => {
    routeHandler(req, res).catch((err) => {
      next(err)
    })
  }
  
  module.exports = {
    attachRouteHandlerWrapper,
  }
  