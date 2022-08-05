export interface IsomerUserProps {
  isomerUserId: string
  email: string
}
export type GithubUserProps = IsomerUserProps & {
  githubId: string
  accessToken: string
}

export type SessionDataProps = IsomerUserProps | GithubUserProps

class UserSessionData {
  readonly githubId?: GithubUserProps["githubId"]

  readonly accessToken?: GithubUserProps["accessToken"]

  readonly isomerUserId: SessionDataProps["isomerUserId"]

  readonly email: SessionDataProps["email"]

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

  getGithubParams() {
    return {
      githubId: this.githubId,
      accessToken: this.accessToken,
      isomerUserId: this.isomerUserId,
      email: this.email,
    }
  }
}

export default UserSessionData
