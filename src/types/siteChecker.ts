export const RepoErrorTypes = {
  BROKEN_LINK: "broken-link",
  BROKEN_IMAGE: "broken-image",
  BROKEN_FILE: "broken-file",
  DUPLICATE_PERMALINK: "duplicate-permalink",
} as const

export interface BrokenRefError {
  linkToAsset: string
  viewablePageInCms: string
  viewablePageInStaging: string
}

export interface BrokenLinkError extends BrokenRefError {
  type: typeof RepoErrorTypes.BROKEN_LINK
  linkedText: string
}

export interface BrokenImageError extends BrokenRefError {
  type: typeof RepoErrorTypes.BROKEN_IMAGE
}

export interface BrokenFileError extends BrokenRefError {
  type: typeof RepoErrorTypes.BROKEN_FILE
  linkedText: string
}

export interface DuplicatePermalinkError {
  type: typeof RepoErrorTypes.DUPLICATE_PERMALINK
  permalink: string
  pagesUsingPermalink: string[]
}

export type RepoError =
  | BrokenLinkError
  | BrokenImageError
  | BrokenFileError
  | DuplicatePermalinkError

export function isRepoError(error: any): error is RepoError {
  return (
    "type" in error &&
    (error.type === RepoErrorTypes.BROKEN_LINK ||
      error.type === RepoErrorTypes.BROKEN_IMAGE ||
      error.type === RepoErrorTypes.BROKEN_FILE ||
      error.type === RepoErrorTypes.DUPLICATE_PERMALINK)
  )
}

export type RepoErrorDto =
  | {
      status: "error" | "loading"
    }
  | {
      status: "success"
      errors: RepoError[]
    }
