import { RedirectionTypes } from "@root/constants"

import { ProdPermalink, StagingPermalink } from "./pages"

export type SiteInfo = {
  savedAt: number
  savedBy: string
  publishedAt: number
  publishedBy: string
  stagingUrl: StagingPermalink
  siteUrl: ProdPermalink
}

export interface DNSRecord {
  source: string
  type: keyof typeof RedirectionTypes
  target: string
}

export interface DnsResultsForSite {
  dnsRecords: DNSRecord[]
  siteUrl: string
}

export const SiteLaunchStatusObject = {
  Launched: "LAUNCHED",
  NotLaunched: "NOT_LAUNCHED",
  Launching: "LAUNCHING",
  Failure: "FAILED",
} as const

export type SiteLaunchStatus = typeof SiteLaunchStatusObject[keyof typeof SiteLaunchStatusObject]

export interface SiteLaunchDto {
  siteStatus: SiteLaunchStatus
  dnsRecords?: DNSRecord[]
  siteUrl?: string
}
