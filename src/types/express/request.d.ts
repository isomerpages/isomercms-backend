import { GrowthBook } from "@growthbook/growthbook"

import { FeatureFlags } from "@root/types/featureFlags"

// to make the file a module and avoid the TypeScript error
export {}

declare global {
  namespace Express {
    export interface Request {
      growthbook: GrowthBook<FeatureFlags>
    }
  }
}
