import axios, { AxiosRequestConfig, AxiosResponse } from "axios"

import { config } from "@config/config"

import logger from "@logger/logger"

import { getAccessToken } from "@utils/token-retrieval-utils"
import tracer from "@utils/tracer"

// Env vars
const GITHUB_ORG_NAME = config.get("github.orgName")

const requestFormatter = async (config: AxiosRequestConfig) => {
  logger.info("Making GitHub API call")

  const authMessage = config.headers.Authorization

  // If accessToken is missing, authMessage is `token `
  // NOTE: This also implies that the user has not provided
  // their own github token and hence, are email login users.
  const isEmailLoginUser =
    !authMessage ||
    authMessage === "token " ||
    authMessage === "token undefined"

  if (isEmailLoginUser) {
    const accessToken = await getAccessToken()
    config.headers.Authorization = `token ${accessToken}`
    tracer.use("http", {
      hooks: {
        request: (span, req, res) => {
          span?.setTag("user.type", "email")
        },
      },
    })
    logger.info(`Email login user made call to Github API: ${config.url}`)
  } else {
    tracer.use("http", {
      hooks: {
        request: (span, req, res) => {
          span?.setTag("user.type", "github")
        },
      },
    })
    logger.info(`Github login user made call to Github API: ${config.url}`)
  }
  return {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
  }
}

const respHandler = (response: AxiosResponse) => {
  // Any status code that lie within the range of 2xx will cause this function to trigger
  const GITHUB_API_LIMIT = 5000
  const remainingRequests = response.headers["x-ratelimit-remaining"]
  if (remainingRequests < GITHUB_API_LIMIT * 0.2) {
    logger.info("80% of access token capacity reached")
  } else if (remainingRequests < GITHUB_API_LIMIT * 0.4) {
    logger.info("60% of access token capacity reached")
  }
  return response
}

const isomerRepoAxiosInstance = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})
isomerRepoAxiosInstance.interceptors.request.use(requestFormatter)
isomerRepoAxiosInstance.interceptors.response.use(respHandler)

const genericGitHubAxiosInstance = axios.create()
genericGitHubAxiosInstance.interceptors.request.use(requestFormatter)
genericGitHubAxiosInstance.interceptors.response.use(respHandler)

export { isomerRepoAxiosInstance, genericGitHubAxiosInstance }
