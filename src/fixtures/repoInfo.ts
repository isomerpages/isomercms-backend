import { ConfigYmlData } from "@root/types/configYml"
import { GitHubRepositoryData } from "@root/types/repoInfo"
import { Brand } from "@root/types/util"

export const MOCK_STAGING_URL_GITHUB: NonNullable<
  ConfigYmlData["staging"]
> = Brand.fromString("https://repo-staging.netlify.app")
export const MOCK_STAGING_URL_CONFIGYML: NonNullable<
  ConfigYmlData["staging"]
> = Brand.fromString("https://repo-staging-configyml.netlify.app")
export const MOCK_STAGING_URL_DB: NonNullable<
  ConfigYmlData["staging"]
> = Brand.fromString("https://repo-staging-db.netlify.app")
export const MOCK_STAGING_LITE_URL_DB: NonNullable<
  ConfigYmlData["staging"]
> = Brand.fromString("https://repo-staging-lite-db.netlify.app")

export const MOCK_PRODUCTION_URL_GITHUB: NonNullable<
  ConfigYmlData["prod"]
> = Brand.fromString("https://repo-prod.netlify.app")
export const MOCK_PRODUCTION_URL_CONFIGYML: NonNullable<
  ConfigYmlData["prod"]
> = Brand.fromString("https://repo-prod-configyml.netlify.app")
export const MOCK_PRODUCTION_URL_DB: NonNullable<
  ConfigYmlData["prod"]
> = Brand.fromString("https://repo-prod-db.netlify.app")

export const repoInfo: GitHubRepositoryData = {
  name: "repo",
  private: false,
  description: `Staging: ${MOCK_STAGING_URL_GITHUB} | Production: ${MOCK_PRODUCTION_URL_GITHUB}`,
  pushed_at: "2021-09-09T02:41:37Z",
  permissions: {
    admin: true,
    maintain: true,
    push: true,
    triage: true,
    pull: true,
  },
}

export const repoInfo2: GitHubRepositoryData = {
  name: "repo2",
  private: false,
  description:
    "Staging: https://repo2-staging.netlify.app | Production: https://repo2-prod.netlify.app",
  pushed_at: "2021-09-09T02:41:37Z",
  permissions: {
    admin: true,
    maintain: true,
    push: true,
    triage: true,
    pull: true,
  },
}

export const adminRepo: GitHubRepositoryData = {
  name: "isomercms-backend",
  private: false,
  description:
    "Staging: https://isomercms-backend-staging.netlify.app | Production: https://isomercms-backend-prod.netlify.app",
  pushed_at: "2021-09-09T02:41:37Z",
  permissions: {
    admin: true,
    maintain: true,
    push: true,
    triage: true,
    pull: true,
  },
}

export const noAccessRepo: GitHubRepositoryData = {
  name: "noaccess",
  private: false,
  description:
    "Staging: https://noaccess-staging.netlify.app | Production: https://noaccess-prod.netlify.app",
  pushed_at: "2021-09-09T02:41:37Z",
  permissions: {
    admin: false,
    maintain: false,
    push: false,
    triage: false,
    pull: true,
  },
}
