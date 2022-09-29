export interface GithubSessionDataProps {
  currentCommitSha: string
  treeSha: string
}

class GithubSessionData {
  private currentCommitSha: GithubSessionDataProps["currentCommitSha"]

  private treeSha: GithubSessionDataProps["treeSha"]

  constructor({ currentCommitSha, treeSha }: GithubSessionDataProps) {
    this.currentCommitSha = currentCommitSha
    this.treeSha = treeSha
  }

  getGithubState() {
    return {
      currentCommitSha: this.currentCommitSha,
      treeSha: this.treeSha,
    }
  }
}

export default GithubSessionData
