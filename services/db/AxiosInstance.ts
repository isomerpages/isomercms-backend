import { AxiosRequestConfig, AxiosResponse } from "axios"

import logger from "@logger/logger"

const axios = require("axios")

// Env vars
const { GITHUB_ORG_NAME } = process.env

const requestFormatter = (config: AxiosRequestConfig) => {
  logger.info("Making GitHub API call")
  return {
    ...config,
    headers: {
      ...config.headers,
      "Content-Type": "application/json",
    },
  }
}

const respHandler = (response: AxiosResponse) => {
  // Any status code that lie within the range of 2xx will cause this function to trigger
  const remainingRequests = response.headers["x-ratelimit-remaining"]
  if (remainingRequests < 2000) {
    logger.info("60% of access token capacity reached")
  } else if (remainingRequests < 1000) {
    logger.info("80% of access token capacity reached")
  }
  return response
}

const gitHubRepoAxiosInstance = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})
gitHubRepoAxiosInstance.interceptors.request.use(requestFormatter)
gitHubRepoAxiosInstance.interceptors.response.use(respHandler)

const miscGitHubAxiosInstance = axios.create()
miscGitHubAxiosInstance.interceptors.request.use(requestFormatter)
miscGitHubAxiosInstance.interceptors.response.use(respHandler)

export { gitHubRepoAxiosInstance, miscGitHubAxiosInstance }
