export type GitFile = {
  content: string
  sha: string
}

export type GitCommitResult = {
  newSha: string
}

export type GitDirectoryItem = {
  name: string
  type: "file" | "dir"
  sha?: string
  path: string
  size: number
  addedTime: number
}

export type DirectoryContents = {
  directories: GitDirectoryItem[]
  files: GitDirectoryItem[]
  total: number
}
