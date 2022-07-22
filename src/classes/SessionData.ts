export interface SessionDataProps {
  githubId?: string
  accessToken?: string
  isomerUserId: string
  email?: string
}

class SessionData {
  private readonly githubId?: SessionDataProps["githubId"]

  private readonly accessToken?: SessionDataProps["accessToken"]

  private readonly isomerUserId: SessionDataProps["isomerUserId"]

  private readonly email?: SessionDataProps["email"]

  private readonly isEmailUser: boolean

  private currentCommitSha?: string

  private treeSha?: string

  private siteName?: string

  constructor({
    githubId,
    accessToken,
    isomerUserId,
    email,
  }: SessionDataProps) {
    this.githubId = githubId
    this.accessToken = accessToken
    this.isomerUserId = isomerUserId
    this.email = email
    this.isEmailUser = !githubId
  }

  getId() {
    if (this.isEmailUser) return this.isomerUserId
    return this.githubId
  }

  getGithubId() {
    return this.githubId
  }

  getAccessToken() {
    return this.accessToken
  }

  getIsomerUserId() {
    return this.isomerUserId
  }

  getEmail() {
    return this.email
  }

  getIsEmailUser() {
    return this.isEmailUser
  }

  addGithubState({
    currentCommitSha,
    treeSha,
  }: {
    currentCommitSha: string
    treeSha: string
  }) {
    this.currentCommitSha = currentCommitSha
    this.treeSha = treeSha
  }

  getGithubState() {
    return {
      currentCommitSha: this.currentCommitSha,
      treeSha: this.treeSha,
    }
  }

  addSiteName(siteName: string) {
    this.siteName = siteName
  }

  getSiteName() {
    return this.siteName
  }
}

export default SessionData
