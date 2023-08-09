import config from "@config/config"

const WHITELISTED_GIT_SERVICE_REPOS = config.get(
  "featureFlags.ggsWhitelistedRepos"
)

export const isGGSWhitelistedRepo = (repoName: string) =>
  WHITELISTED_GIT_SERVICE_REPOS.split(",").includes(repoName)
