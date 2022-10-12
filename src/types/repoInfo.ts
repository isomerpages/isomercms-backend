export type GitHubRepositoryData = {
  name: string
  private: boolean
  description: string
  pushed_at: string
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
}

export type RepositoryData = {
  lastUpdated: GitHubRepositoryData["pushed_at"]
  permissions: GitHubRepositoryData["permissions"]
  repoName: GitHubRepositoryData["name"]
  isPrivate: GitHubRepositoryData["private"]
}
