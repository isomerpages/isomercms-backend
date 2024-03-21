import { GrowthBook } from "@growthbook/growthbook"
import _ from "lodash"

import { FeatureFlags } from "@root/types/featureFlags"

import UserSessionData, { SessionDataProps } from "./UserSessionData"

export type UserWithSiteSessionDataProps = SessionDataProps & {
  siteName: string
  growthbook?: GrowthBook
}

type UserInfo = Pick<
  UserWithSiteSessionData,
  "githubId" | "siteName" | "isomerUserId" | "email"
>

/**
 * Object containing user information retrieved from the isomercms cookie, and the site being accessed.
 * Not to be used as a general context object.
 */
class UserWithSiteSessionData extends UserSessionData {
  readonly siteName: string

  readonly growthbook?: GrowthBook<FeatureFlags>

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

  getLogMeta = (): UserInfo => {
    const meta = super.getGithubParams()
    const redactedMeta = _.omit(meta, "accessToken")

    return {
      ...redactedMeta,
      siteName: this.siteName,
    }
  }
}

export default UserWithSiteSessionData
