export type GitFile = {
  content: string
  sha: string
}

export type GitDirectoryItem = {
  name: string
  type: "file" | "dir"
  sha: string
  path: string
  size: number
}

export type GitCommitResult = {
  newSha: string
}
