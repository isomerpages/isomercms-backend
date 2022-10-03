// NOTE: Types here are with reference to:
// https://docs.github.com/en/rest/commits/commits#compare-two-commits

export type FileChangeStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged"

export interface RawFileChangeInfo {
  sha: string
  filename: string
  status: FileChangeStatus
  additions: number
  deletions: number
  changes: number
  // eslint-disable-next-line camelcase
  blob_url: string
  // eslint-disable-next-line camelcase
  raw_url: string
  // eslint-disable-next-line camelcase
  contents_url: string
  patch: string
}
