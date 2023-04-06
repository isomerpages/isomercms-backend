// NOTE: Types here are with reference to:
// https://docs.github.com/en/rest/commits/commits#compare-two-commits

export type GithubEditInfo = {
  author: string
  unixTime: number
}
export type Sha = string
export type ShaMappings = Record<Sha, GithubEditInfo>
export type FileChangeStatus =
  | "added"
  | "removed"
  | "modified"
  | "renamed"
  | "copied"
  | "changed"
  | "unchanged"

export interface Author {
  name: string
  email: string
  date: string
}

export interface RawCommit {
  url: string
  author: Author
  // NOTE: message is assumed to have a JSON structure with
  // the field `email` existing.
  // Moreover, this field is assumed to point to the
  // author of the commit.
  message: string
}

export interface Commit {
  url: string
  sha: string
  commit: RawCommit
}

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
}

export interface IsomerCommitMessage {
  message: string
  fileName: string
  userId: string
}

/**
 * NOTE: Properties can be undefined and caller should validate/give sane default.
 *
 * This should happen as our current format is not backward compat
 * as this implies we rewrite all existing commit messages to have this format.
 * We should instead default to the one existing on Github.
 */
export const fromGithubCommitMessage = (
  message: string
): Partial<IsomerCommitMessage> => {
  try {
    const parsed = JSON.parse(message)
    return {
      message: parsed.message,
      fileName: parsed.filename,
      userId: parsed.userId,
    }
  } catch {
    return {}
  }
}

export interface RawPullRequest {
  title: string
  body: string
  changed_files: number
  created_at: string
}

export interface RawComment {
  body: string
  created_at: string
}
