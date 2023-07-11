import axios, { AxiosError } from "axios"

import { config } from "@config/config"

import logger from "@root/logger/logger"

const GITHUB_ORG_NAME = config.get("github.orgName")
const NETLIFY_ACCESS_TOKEN = config.get("netlify.accessToken")

type NetlifySiteDetails = {
  id: string
  password: string
  build_settings: {
    repo_path: string
    repo_branch: string
  }
}

const isAxiosError = (err: unknown) =>
  !(typeof err === "object" && !!err && "message" in err)

// Retrieves all netlify sites which build from the given repo's staging branch
const getNetlifySiteDetails = async (
  repoName: string
): Promise<NetlifySiteDetails[]> => {
  const endpoint = "https://api.netlify.com/api/v1/sites"
  const headers = {
    Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  }
  const repoPath = `${GITHUB_ORG_NAME}/${repoName}`
  try {
    const allSites = await axios.get<NetlifySiteDetails[]>(endpoint, {
      headers,
    })
    const relatedSites = allSites.data.filter(
      (site) =>
        site.build_settings.repo_path === repoPath &&
        site.build_settings.repo_branch === "staging"
    )
    return relatedSites
  } catch (err: unknown) {
    if (!isAxiosError(err))
      logger.error(
        `Error occurred when retrieving netlify sites: ${JSON.stringify(err)}`
      )
    const axiosErr = err as AxiosError
    if (axiosErr.message)
      logger.error(
        `Error occurred when retrieving netlify sites: ${axiosErr.message}`
      )
    else
      logger.error(
        `Error occurred when retrieving netlify sites: ${JSON.stringify(err)}`
      )
  }
  return []
}

const updateNetlifySite = async (
  repoName: string,
  repoId: string,
  password: string
) => {
  const endpoint = `https://api.netlify.com/api/v1/sites/${repoId}`
  const headers = {
    Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  }
  const settings = {
    password,
    build_settings: {
      stop_builds: true,
    },
  }
  try {
    await axios.patch(endpoint, settings, { headers })
  } catch (err: unknown) {
    if (!isAxiosError(err))
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${JSON.stringify(
          err
        )}`
      )
    const axiosErr = err as AxiosError
    if (axiosErr.message)
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${axiosErr.message}`
      )
    else
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${JSON.stringify(
          err
        )}`
      )
  }
}

export const privatiseNetlifySite = async (
  repoName: string,
  password: string
) => {
  const netlifySiteDetails = await getNetlifySiteDetails(repoName)

  await Promise.all(
    netlifySiteDetails.map(async (netlifySite) => {
      // We always stop the builds - we're only using netlify as a backup for these amplify sites
      const { id } = netlifySite
      await updateNetlifySite(repoName, id, password)
    })
  )
}
