import UserSessionData, { SessionDataProps } from "./UserSessionData"

export type UserWithSiteSessionDataProps = SessionDataProps & {
  siteName: string
}

class UserWithSiteSessionData extends UserSessionData {
  readonly siteName: string

  constructor(props: UserWithSiteSessionDataProps) {
    super(props)
    this.siteName = props.siteName
  }

  getGithubParamsWithSite() {
    return {
      githubId: this.githubId,
      accessToken: this.accessToken,
      isomerUserId: this.isomerUserId,
      email: this.email,
      siteName: this.siteName,
    }
  }
}

export default UserWithSiteSessionData
