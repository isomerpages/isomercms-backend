export interface RepoErrorTypes {
  BROKEN_LINK: "broken-link"
  BROKEN_IMAGE: "broken-image"
  BROKEN_FILE: "broken-file"
  DUPLICATE_PERMALINK: "duplicate-permalink"
}

export interface BrokenRefError {
  linkToAsset: string
  viewablePageInCms: string
  viewablePageInStaging: string
}

export interface BrokenLinkError extends BrokenRefError {
  type: RepoErrorTypes["BROKEN_LINK"]
  linkedText: string
}

export interface BrokenImageError extends BrokenRefError {
  type: RepoErrorTypes["BROKEN_IMAGE"]
}

export interface BrokenFileError extends BrokenRefError {
  type: RepoErrorTypes["BROKEN_FILE"]
  linkedText: string
}

export interface DuplicatePermalinkError {
  type: RepoErrorTypes["DUPLICATE_PERMALINK"]
  permalink: string
  pagesUsingPermalink: string[]
}

export type RepoError =
  | BrokenLinkError
  | BrokenImageError
  | BrokenFileError
  | DuplicatePermalinkError
