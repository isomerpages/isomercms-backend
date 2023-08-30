// Use for type safety with GrowthBook
// Add BE feature flags here to mirror that on GrowthBook
// Note: key should mirror GrowthBook exactly as it is
export interface FeatureFlags {
  ggs_whitelisted_repos: { repos: string[] }
}

// List of attributes we set in GrowthBook Instance in auth middleware
export type GrowthBookAttributes = {
  isomerUserId: string
  email: string
  githubId?: string
  siteName?: string
}
