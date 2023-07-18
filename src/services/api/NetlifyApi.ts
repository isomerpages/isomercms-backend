import axios from "axios"

import { config } from "@config/config"

import { isAxiosError } from "@utils/axios-utils"

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
    if (!isAxiosError(err)) {
      logger.error(
        `Error occurred when retrieving netlify sites: ${JSON.stringify(err)}`
      )
      return []
    }
    if (err.message)
      logger.error(
        `Error occurred when retrieving netlify sites: ${err.message}`
      )
    else
      logger.error(
        `Error occurred when retrieving netlify sites: ${JSON.stringify(err)}`
      )
  }
  return []
}

const updatePasswordAndStopBuildNetlifySite = async (
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
    if (!isAxiosError(err)) {
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${JSON.stringify(
          err
        )}`
      )
      return
    }
    if (err.message)
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${err.message}`
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
      await updatePasswordAndStopBuildNetlifySite(repoName, id, password)
    })
  )
}
