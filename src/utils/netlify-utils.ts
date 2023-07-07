import axios from "axios"

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

type UpdateNetlifySiteDetails = {
  password: string
  build_settings: {
    stop_builds: boolean
  }
}

// Retrieves all netlify sites which build from the given repo's staging branch
const getNetlifySiteDetails = async (repoName: string) => {
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
  } catch (err: any) {
    if (err.message)
      logger.error(
        `Error occurred when retrieving netlify sites: ${err.message}`
      )
    else logger.error("Error occurred when retrieving netlify sites")
  }
  return []
}

const updateNetlifySite = async (
  repoName: string,
  repoId: string,
  settings: UpdateNetlifySiteDetails
) => {
  const endpoint = `https://api.netlify.com/api/v1/sites/${repoId}`
  const headers = {
    Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  }
  try {
    await axios.patch(endpoint, settings, { headers })
  } catch (err: any) {
    if (err.message)
      logger.error(
        `Error occurred when updating password for site ${repoName}: ${err.message}`
      )
    else
      logger.error(`Error occurred when updating password for site ${repoName}`)
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
      const updatedSettings = {
        build_settings: {
          stop_builds: true,
        },
        password,
      }
      await updateNetlifySite(repoName, id, updatedSettings)
    })
  )
}
