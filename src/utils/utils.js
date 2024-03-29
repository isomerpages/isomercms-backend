const slugify = require("slugify")
const urlTemplate = require("url-template")

const { config } = require("@config/config")

const { genericGitHubAxiosInstance } = require("@services/api/AxiosInstance")

const GITHUB_ORG_NAME = config.get("github.orgName")

async function getCommitAndTreeSha(repo, accessToken, branchRef = "staging") {
  const headers = {
    Authorization: `token ${accessToken}`,
  }
  // Get the commits of the repo
  const endpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/commits`
  )
  const endpoint = endpointTemplate.expand({ GITHUB_ORG_NAME, repo })

  const { data: commits } = await genericGitHubAxiosInstance.get(endpoint, {
    params: {
      sha: branchRef,
    },
    headers,
  })
  // Get the tree sha of the latest commit
  const {
    commit: {
      tree: { sha: treeSha },
    },
  } = commits[0]
  const currentCommitSha = commits[0].sha

  return { treeSha, currentCommitSha }
}

// retrieve the tree from given tree sha
async function getTree(
  repo,
  accessToken,
  treeSha,
  isRecursive,
  branchRef = "staging"
) {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: "application/json",
  }

  const params = {
    ref: branchRef,
  }

  if (isRecursive) params.recursive = true

  const endpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/git/trees/{treeSha}`
  )
  const endpoint = endpointTemplate.expand({ GITHUB_ORG_NAME, repo, treeSha })
  const {
    data: { tree: gitTree },
  } = await genericGitHubAxiosInstance.get(endpoint, {
    params,
    headers,
  })

  return gitTree
}

// send the new tree object back to Github and point the latest commit on the staging branch to it
async function sendTree(
  gitTree,
  baseTreeSha,
  currentCommitSha,
  repo,
  accessToken,
  message,
  branchRef = "staging"
) {
  const headers = {
    Authorization: `token ${accessToken}`,
  }
  const endpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/git/trees`
  )
  const endpoint = endpointTemplate.expand({ GITHUB_ORG_NAME, repo })
  const resp = await genericGitHubAxiosInstance.post(
    endpoint,
    {
      tree: gitTree,
      base_tree: baseTreeSha,
    },
    {
      headers,
    }
  )

  const {
    data: { sha: newTreeSha },
  } = resp

  const refEndpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/git/refs/heads/{branchRef}`
  )
  const refEndpoint = refEndpointTemplate.expand({
    GITHUB_ORG_NAME,
    repo,
    branchRef,
  })
  const baseCommitEndpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/git/commits`
  )
  const baseCommitEndpoint = baseCommitEndpointTemplate.expand({
    GITHUB_ORG_NAME,
    repo,
  })

  const newCommitResp = await genericGitHubAxiosInstance.post(
    baseCommitEndpoint,
    {
      message,
      tree: newTreeSha,
      parents: [currentCommitSha],
    },
    {
      headers,
    }
  )

  const newCommitSha = newCommitResp.data.sha

  /**
   * The `staging` branch reference will now point
   * to `newCommitSha` instead of `currentCommitSha`
   */
  await genericGitHubAxiosInstance.patch(
    refEndpoint,
    {
      sha: newCommitSha,
      force: true,
    },
    {
      headers,
    }
  )
}

// Revert the staging branch back to `originalCommitSha`
async function revertCommit(
  originalCommitSha,
  repo,
  accessToken,
  branchRef = "staging"
) {
  const headers = {
    Authorization: `token ${accessToken}`,
  }

  const refEndpointTemplate = urlTemplate.parse(
    `https://api.github.com/repos/{GITHUB_ORG_NAME}/{repo}/git/refs/heads/{branchRef}`
  )
  const refEndpoint = refEndpointTemplate.expand({
    GITHUB_ORG_NAME,
    repo,
    branchRef,
  })

  /**
   * The `staging` branch reference will now point to `currentCommitSha`
   */
  await genericGitHubAxiosInstance.patch(
    refEndpoint,
    {
      sha: originalCommitSha,
      force: true,
    },
    {
      headers,
    }
  )
}

function slugifyCollectionName(collectionName) {
  return slugify(collectionName, { lower: true }).replace(/[^a-zA-Z0-9-]/g, "")
}
/**
 * A function to deslugify a collection's name
 */
function deslugifyCollectionName(collectionName) {
  return collectionName
    .split("-")
    .map((string) => string.charAt(0).toUpperCase() + string.slice(1)) // capitalize first letter
    .join(" ") // join it back together
}

module.exports = {
  slugifyCollectionName,
  deslugifyCollectionName,
  getCommitAndTreeSha,
  getTree,
  sendTree,
  revertCommit,
}
