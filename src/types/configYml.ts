import { ProdPermalink, StagingPermalink } from "./pages"

export type ConfigYmlData = {
  staging?: StagingPermalink
  prod?: ProdPermalink
  "facebook-pixel": string
}
