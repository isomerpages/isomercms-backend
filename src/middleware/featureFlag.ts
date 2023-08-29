import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import config from "@root/config/config"
import { RequestHandlerWithGrowthbook } from "@root/types"
import { getNewGrowthbookInstance } from "@root/utils/growthbook-utils"

export const featureFlagMiddleware: RequestHandlerWithGrowthbook<
  never,
  unknown,
  unknown,
  never,
  { userWithSiteSessionData: UserWithSiteSessionData }
> = async (req, res, next) => {
  req.growthbook = getNewGrowthbookInstance(config.get("growthbook.clientKey"))

  // Clean up at the end of the request
  res.on("close", () => {
    if (req.growthbook) req.growthbook.destroy()
  })

  // Wait for features to load (will be cached in-memory for future requests)
  req.growthbook
    .loadFeatures({ autoRefresh: true })
    .then(() => next())
    .catch((e: unknown) => {
      console.error("Failed to load features from GrowthBook", e)
      next()
    })
}
