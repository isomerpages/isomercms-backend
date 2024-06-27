import { GrowthBook, setPolyfills } from "@growthbook/growthbook"

import { config } from "@root/config/config"
import { FEATURE_FLAGS } from "@root/constants/featureFlags"
import {
  FeatureFlags,
  CloudmersiveConfigType,
  MonitoringConfig,
} from "@root/types/featureFlags"

const GROWTHBOOK_API_HOST = "https://cdn.growthbook.io"

export const getNewGrowthbookInstance = ({
  clientKey,
  subscribeToChanges,
}: {
  clientKey: string
  subscribeToChanges: boolean
}) =>
  new GrowthBook<FeatureFlags>({
    apiHost: GROWTHBOOK_API_HOST,
    clientKey,
    subscribeToChanges,
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
    FEATURE_FLAGS.IS_BUILD_TIMES_REDUCTION_ENABLED,
    false
  )

  return isWhitelistedRedBuildTimesRepo
}

export const isShowStagingBuildStatusWhitelistedRepo = (
  growthbook: GrowthBook<FeatureFlags> | undefined
): boolean => {
  if (!growthbook) return false

  return growthbook.getFeatureValue(
    FEATURE_FLAGS.IS_SHOW_STAGING_BUILD_STATUS_ENABLED,
    false
  )
}

export const isCloudmersiveEnabled = (
  growthbook: GrowthBook<FeatureFlags> | undefined
): CloudmersiveConfigType => {
  const defaultConfig = {
    is_enabled: false,
    timeout: 60000,
  }
  if (!growthbook) return defaultConfig

  return growthbook.getFeatureValue(
    FEATURE_FLAGS.IS_CLOUDMERSIVE_ENABLED,
    defaultConfig
  )
}

export const getMonitoringConfig = (
  growthbook: GrowthBook<FeatureFlags> | undefined
): MonitoringConfig => {
  const defaultConfig = {
    isEnabled: true,
    whitelistedRepos: [],
  }
  if (!growthbook) return defaultConfig
  return growthbook.getFeatureValue(
    FEATURE_FLAGS.IS_MONITORING_ENABLED,
    defaultConfig
  )
}
