import { ProdPermalink, StagingPermalink } from "./pages"

export type SiteInfo = {
  savedAt: number
  savedBy: string
  publishedAt: number
  publishedBy: string
  stagingUrl: StagingPermalink
  siteUrl: ProdPermalink
}
