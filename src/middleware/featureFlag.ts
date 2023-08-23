import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import config from "@root/config/config"
import { RequestHandlerWithGrowthbook } from "@root/types"
import { getNewGrowthbookInstance } from "@root/utils/growthbook-utils"

export class FeatureFlagMiddleware {
  //   private readonly featureFlagService: FeatureFlagService

  //   constructor({
  //     featureFlagService,
  //   }: {
  //     featureFlagService: FeatureFlagService
  //   }) {
  //     this.featureFlagService = featureFlagService
  //   }

  loadFeatures: RequestHandlerWithGrowthbook<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    req.growthbook = getNewGrowthbookInstance(
      config.get("growthbook.clientKey")
    )
    console.log("Created growth book instance: ", req.growthbook.getFeatures())

    // Clean up at the end of the request
    res.on("close", () => {
      console.log("Destroying growthbook")
      req.growthbook.destroy()
    })

    // Wait for features to load (will be cached in-memory for future requests)
    req.growthbook
      .loadFeatures()
      .then(() => next())
      .catch((e: unknown) => {
        console.error("Failed to load features from GrowthBook", e)
        next()
      })
  }
}

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
    console.log("Destroying growthbook")
    req.growthbook.destroy()
  })

  // Wait for features to load (will be cached in-memory for future requests)
  req.growthbook
    .loadFeatures()
    .then(() => {
      console.log(
        "Created growth book instance: ",
        req.growthbook.getFeatures()
      )
      next()
    })
    .catch((e: unknown) => {
      console.error("Failed to load features from GrowthBook", e)
      next()
    })
}
