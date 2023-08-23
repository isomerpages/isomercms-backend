import {
  FeatureFlag,
  FeatureFlagSupportedTypes,
} from "@root/types/featureFlags"

// List of all BE feature flags corresponding to GrowthBook
// TODO: Add after setting up on GrowthBook
export const featureFlags: Record<string, FeatureFlag> = {
  sampleFeature: {
    key: "sampleFeature",
    type: FeatureFlagSupportedTypes.string,
  },
}
