const FeatureFlagSupportedTypes = {
  boolean: "boolean",
  number: "number",
  string: "string",
  json: "json",
} as const

type FeatureFlagTypes = typeof FeatureFlagSupportedTypes[keyof typeof FeatureFlagSupportedTypes]

export type FeatureFlag = {
  key: string
  type: FeatureFlagTypes
}

// List of all feature flags corresponding to GrowthBook
export const featureFlags: Record<string, FeatureFlag> = {
  sampleFeature: {
    key: "sampleFeature",
    type: FeatureFlagSupportedTypes.string,
  },
}
