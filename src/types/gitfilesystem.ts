export type GitFile = {
  content: string
  sha: string
  name: string
  type: "file"
  path: string
  size: number
}

export type GitDirectory = {
  name: string
  type: "dir"
  sha: string
  path: string
  size: number
}

export type GitDirectoryItem = GitDirectory | GitFile

export type GitCommitResult = {
  newSha: string
}
