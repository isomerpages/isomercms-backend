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
  children?: string[]
}

export type GitFileItem = {
  name: string
  type: string
  title: string
  date: string
  resourceType?: string
}

export type DirectoryContents = {
  directories: GitDirectoryItem[]
  files: GitDirectoryItem[]
  total: number
}
