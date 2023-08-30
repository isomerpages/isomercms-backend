import { GrowthBook } from "@growthbook/growthbook"

import { FeatureFlags } from "@root/types/featureFlags"

// Empty export to make this file a module therefore allow
// global augmentation (avoiding the related error)
export {}

declare global {
  namespace Express {
    export interface Request {
      growthbook?: GrowthBook<FeatureFlags>
    }
  }
}
