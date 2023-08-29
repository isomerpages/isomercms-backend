import { GrowthBook } from "@growthbook/growthbook"

import UserSessionData, { SessionDataProps } from "./UserSessionData"

export type UserWithSiteSessionDataProps = SessionDataProps & {
  siteName: string
  growthbook?: GrowthBook
}

/**
 * Object containing user information retrieved from the isomercms cookie, and the site being accessed.
 * Not to be used as a general context object.
 */
class UserWithSiteSessionData extends UserSessionData {
  readonly siteName: string

  readonly growthbook?: GrowthBook

  constructor(props: UserWithSiteSessionDataProps) {
    super(props)
    this.siteName = props.siteName
    if (props.growthbook) {
      this.growthbook = props.growthbook
    }
  }

  getGithubParamsWithSite() {
    return {
      ...super.getGithubParams(),
      siteName: this.siteName,
    }
  }
}

export default UserWithSiteSessionData
