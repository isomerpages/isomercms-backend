import tracer from "@utils/tracer"

import { RequestHandlerWithGrowthbook } from "@root/types"

// eslint-disable-next-line import/prefer-default-export
export const traceUserMiddleware: RequestHandlerWithGrowthbook<
  never,
  unknown,
  unknown,
  never
> = async (req, res, next) => {
  if (req.session?.userInfo?.isomerUserId) {
    tracer.setUser({
      id: req.session.userInfo.isomerUserId,
      session_id: req.session.id,

      // Could consider adding the entire userInfo object if we are comfortable having that data in DD traces
    })
  }
  next()
}
