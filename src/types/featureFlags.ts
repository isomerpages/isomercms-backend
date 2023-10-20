// Use for type safety with GrowthBook
// Add BE feature flags here to mirror that on GrowthBook
// Note: key should mirror GrowthBook exactly as it is
export interface FeatureFlags {
  ggs_whitelisted_repos: { repos: string[] }
  is_build_times_reduction_enabled: boolean
  is_ggs_enabled: boolean
}

// List of attributes we set in GrowthBook Instance in auth middleware
export type GrowthBookAttributes = {
  isomerUserId: string
  email: string
  githubId?: string
  siteName?: string
}
