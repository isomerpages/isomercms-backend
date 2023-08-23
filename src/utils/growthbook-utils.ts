import { GrowthBook } from "@growthbook/growthbook"

const { setPolyfills } = require("@growthbook/growthbook")

const GROWTHBOOK_API_HOST = "https://cdn.growthbook.io"

export const getNewGrowthbookInstance = (clientKey: string, isDev = false) =>
  new GrowthBook({
    apiHost: GROWTHBOOK_API_HOST,
    clientKey,
    enableDevMode: isDev,
  })

export const setBrowserPolyfills = () => {
  setPolyfills({
    // Required for Node 17 or earlier
    fetch: require("cross-fetch"),
    // Optional, can make feature rollouts faster
    EventSource: require("eventsource"),
  })
}
