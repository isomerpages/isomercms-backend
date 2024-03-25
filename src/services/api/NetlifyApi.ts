import axios from "axios"
import urlTemplate from "url-template"

import { config } from "@config/config"

import baseLogger from "@root/logger/logger"

const logger = baseLogger.child({ module: "NetlifyApi" })

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
  } catch (err) {
    logger.error(err, {
      params: {
        repoName,
      },
    })
    return []
  }
}

const updatePasswordAndStopBuildNetlifySite = async (
  repoName: string,
  repoId: string,
  password: string
) => {
  const endpointTemplate = urlTemplate.parse(
    `https://api.netlify.com/api/v1/sites/{repoId}`
  )
  const endpoint = endpointTemplate.expand({ repoId })
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
    logger.error(err, {
      params: {
        repoName,
        repoId,
      },
    })
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
