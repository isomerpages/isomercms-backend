export interface IsomerUserProps {
  isomerUserId: string
  email: string
}
export interface GithubUserProps {
  githubId: string
  accessToken: string
  isomerUserId: string
  email: string
}

type SessionDataProps = IsomerUserProps | GithubUserProps

class UserSessionData {
  readonly githubId?: GithubUserProps["githubId"]

  private readonly accessToken?: GithubUserProps["accessToken"]

  private readonly isomerUserId: SessionDataProps["isomerUserId"]

  private readonly email?: SessionDataProps["email"]

  private currentCommitSha?: string

  private treeSha?: string

  private siteName?: string

  private isGithubProps(
    sessionDataProps: SessionDataProps
  ): sessionDataProps is GithubUserProps {
    return (sessionDataProps as GithubUserProps).githubId !== undefined
  }

  constructor(props: SessionDataProps) {
    if (this.isGithubProps(props)) {
      this.githubId = props.githubId
      this.accessToken = props.accessToken
    }
    this.isomerUserId = props.isomerUserId
    this.email = props.email
  }

  isEmailUser() {
    return !this.githubId
  }

  getId() {
    if (this.isEmailUser()) return this.isomerUserId
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

export default UserSessionData
