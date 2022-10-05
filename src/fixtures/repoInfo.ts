import { GitHubRepositoryData } from "@root/types/repoInfo"

export const repoInfo: GitHubRepositoryData = {
  name: "repo",
  private: false,
  description:
    "Staging: https://repo-staging.netlify.app | Production: https://repo-prod.netlify.app",
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
