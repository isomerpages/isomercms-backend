import axios, {
  AxiosHeaderValue,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import _ from "lodash"

import { config } from "@config/config"

import logger from "@logger/logger"

import tracer from "@utils/tracer"

import { tokenServiceInstance } from "@services/db/TokenService"

import { statsService } from "../infra/StatsService"

const GGS_EXPERIMENTAL_TRACKING_SITES = config
  .get("featureFlags.ggsTrackedSites")
  .split(",")

const REPOS_SUBSTRING = "repos/isomerpages"
const extractRepoNameFromGithubUrl = (url: string): string => {
  const idx = url.search(REPOS_SUBSTRING)
  // NOTE: Should not hit here because we check that the url contains the site already
  if (idx === -1) return ""
  const ignoredLength = REPOS_SUBSTRING.length
  return _.takeWhile(
    url.slice(idx + ignoredLength + 1),
    (char) => char !== "/"
  ).join("")
}

const getIsEmailUserFromAuthMessage = (
  authMessage?: AxiosHeaderValue
): boolean =>
  !authMessage || authMessage === "token " || authMessage === "token undefined"

// Env vars
const GITHUB_ORG_NAME = config.get("github.orgName")

const requestFormatter = async (
  axiosConfig: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> => {
  logger.info("Making GitHub API call")

  const authMessage = axiosConfig.headers?.Authorization

  // If accessToken is missing, authMessage is `token `
  // NOTE: This also implies that the user has not provided
  // their own github token and hence, are email login users.
  const isEmailLoginUser = getIsEmailUserFromAuthMessage(authMessage)
  const span = tracer.scope().active()

  if (isEmailLoginUser) {
    const accessToken = await tokenServiceInstance.getAccessToken()
    if (accessToken.isOk()) {
      span?.setTag("user.type", "email")
      const requestMethod = axiosConfig.method ?? "undefined method"
      logger.info(
        `Email login user made ${requestMethod} call to Github API: ${axiosConfig.url}`
      )

      const finalAxiosConfig = axiosConfig
      if (!finalAxiosConfig.headers["Content-Type"]) {
        finalAxiosConfig.headers["Content-Type"] = "application/json"
      }
      finalAxiosConfig.headers.Authorization = `token ${accessToken.value}`
      return finalAxiosConfig
    }
  }

  span?.setTag("user.type", "github")

  const requestMethod = axiosConfig.method ?? "undefined method"
  logger.info(
    `Github login user made ${requestMethod} call to Github API: ${axiosConfig.url}`
  )

  const finalAxiosConfig = axiosConfig
  if (!finalAxiosConfig.headers["Content-Type"]) {
    finalAxiosConfig.headers["Content-Type"] = "application/json"
  }
  return finalAxiosConfig
}

const respHandler = (response: AxiosResponse) => {
  // Any status code that lie within the range of 2xx will cause this function to trigger
  tokenServiceInstance.onResponse(response)
  return response
}

const githubApiInterceptor = (resp: AxiosResponse) => {
  const fullUrl = `${resp.config.baseURL || ""}${resp.config.url || ""}`
  if (
    resp.status !== 304 &&
    _.some(GGS_EXPERIMENTAL_TRACKING_SITES, (site) => fullUrl.includes(site)) &&
    resp.config.method
  ) {
    statsService.incrementGithubApiCall(
      resp.config.method,
      extractRepoNameFromGithubUrl(fullUrl)
    )
  }
  return resp
}

const isomerRepoAxiosInstance = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})

isomerRepoAxiosInstance.interceptors.request.use(requestFormatter)
isomerRepoAxiosInstance.interceptors.response.use(respHandler)
isomerRepoAxiosInstance.interceptors.response.use(githubApiInterceptor)

const genericGitHubAxiosInstance = axios.create()
genericGitHubAxiosInstance.interceptors.request.use(requestFormatter)
genericGitHubAxiosInstance.interceptors.response.use(respHandler)
genericGitHubAxiosInstance.interceptors.response.use(githubApiInterceptor)

export { isomerRepoAxiosInstance, genericGitHubAxiosInstance }
