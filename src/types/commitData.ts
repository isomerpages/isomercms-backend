export type GitHubCommitData = {
  author: {
    name: string
    email: string
    date: string
  }
  message: string
}

export type GitLocalDiskCommitData = {
  sha: string
} & GitHubCommitData

// returned by Simple Git
export type GitLocalDiskRawCommitData = {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}
