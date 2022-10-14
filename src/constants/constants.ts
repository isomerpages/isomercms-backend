export enum JobStatus {
  Ready = "READY", // Ready to run jobs
  Running = "RUNNING", // A job is running
  Failed = "FAILED", // A job has failed and recovery is needed
}

export enum SiteStatus {
  Empty = "EMPTY", // A site record site is being initialized
  Initialized = "INITIALIZED",
  Launched = "LAUNCHED",
}

export enum RedirectionTypes {
  CNAME = "CNAME",
  A = "A",
}

export enum CollaboratorRoles {
  Admin = "ADMIN",
  Contributor = "CONTRIBUTOR",
}

export const E2E_ISOMER_ID = "-1"
export const E2E_TEST_EMAIL = "test@e2e"
export const E2E_TEST_CONTACT = "12345678"

export const GH_MAX_REPO_COUNT = 100
export const ISOMERPAGES_REPO_PAGE_COUNT =
  (process.env.ISOMERPAGES_REPO_PAGE_COUNT &&
    parseInt(process.env.ISOMERPAGES_REPO_PAGE_COUNT, 10)) ||
  3
export const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
export const ISOMER_ADMIN_REPOS = [
  "isomercms-backend",
  "isomercms-frontend",
  "isomer-redirection",
  "isomerpages-template",
  "isomer-conversion-scripts",
  "isomer-wysiwyg",
  "isomer-slackbot",
  "isomer-tooling",
  "generate-site",
  "travisci-scripts",
  "recommender-train",
  "editor",
  "ci-test",
  "infra",
  "markdown-helper",
]

export const INACTIVE_USER_THRESHOLD_DAYS = 60
