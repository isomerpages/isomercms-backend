import UserSessionData, { SessionDataProps } from "./UserSessionData"

export type UserWithSiteSessionDataProps = SessionDataProps & {
  siteName: string
}

/**
 * Object containing user information retrieved from the isomercms cookie, and the site being accessed.
 * Not to be used as a general context object.
 */
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
