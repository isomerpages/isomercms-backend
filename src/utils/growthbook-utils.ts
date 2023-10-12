import { GrowthBook, setPolyfills } from "@growthbook/growthbook"

import config from "@root/config/config"
import { FEATURE_FLAGS } from "@root/constants/featureFlags"
import { FeatureFlags } from "@root/types/featureFlags"

const GROWTHBOOK_API_HOST = "https://cdn.growthbook.io"

export const getNewGrowthbookInstance = (clientKey: string) =>
  new GrowthBook<FeatureFlags>({
    apiHost: GROWTHBOOK_API_HOST,
    clientKey,
    enableDevMode: config.get("env") === "dev",
  })

export const setBrowserPolyfills = () => {
  setPolyfills({
    // Required for Node 17 or earlier
    fetch: require("cross-fetch"),
    // Optional, can make feature rollouts faster
    EventSource: require("eventsource"),
  })
}

export const isReduceBuildTimesWhitelistedRepo = (
  growthbook: GrowthBook<FeatureFlags> | undefined
): boolean => {
  if (!growthbook) return false

  const isWhitelistedRedBuildTimesRepo = growthbook.getFeatureValue(
    FEATURE_FLAGS.REDUCE_BUILD_TIMES_WHITELISTED_REPOS,
    false
  )

  return isWhitelistedRedBuildTimesRepo
}
