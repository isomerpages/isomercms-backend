export type GitFile = {
  contents: string
  sha: string
}

export type GitDirectoryItem = {
  name: string
  type: "file" | "dir"
  sha: string
  path: string
}
