export type GitHubCommitData = {
  author: {
    name: string
    email: string
    date: string
  }
  message: string
  sha?: string
}

// returned by Simple Git
export type GitLocalDiskRawCommitData = {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}
