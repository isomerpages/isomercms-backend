import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { config } from "@root/config/config"
import logger from "@root/logger/logger"
import { RequestHandlerWithGrowthbook } from "@root/types"
import { getNewGrowthbookInstance } from "@root/utils/growthbook-utils"

// Keep one GrowthBook instance at module level
// The instance will handle internal cache refreshes via a SSE connection
const gb = getNewGrowthbookInstance({
  clientKey: config.get("growthbook.clientKey"),
  subscribeToChanges: true,
})

gb.loadFeatures().catch((e: unknown) => {
  logger.error({
    error: e,
    message: "Failed to load features from GrowthBook at startup",
  })
})

// eslint-disable-next-line import/prefer-default-export
export const featureFlagMiddleware: RequestHandlerWithGrowthbook<
  never,
  unknown,
  unknown,
  never,
  { userWithSiteSessionData: UserWithSiteSessionData }
> = async (req, res, next) => {
  req.growthbook = getNewGrowthbookInstance({
    clientKey: config.get("growthbook.clientKey"),
    subscribeToChanges: false, // request-level instances should have immutable flag values
  })

  // Clean up at the end of the request
  res.on("close", () => {
    if (req.growthbook) req.growthbook.destroy()
  })

  // Wait for features to load (will be cached in-memory for future requests)
  req.growthbook
    .loadFeatures()
    .catch((e: unknown) => {
      logger.error({
        error: e,
        message: "Failed to load features from GrowthBook",
      })
    })
    .then(() => next())
}
