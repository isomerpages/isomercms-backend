const axios = require("axios")

const config = require("@config/config")

const GITHUB_ORG_NAME = config.get("github.orgName")

async function getCommitAndTreeSha(repo, accessToken, branchRef = "staging") {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: "application/json",
  }
  // Get the commits of the repo
  const { data: commits } = await axios.get(
    `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/commits`,
    {
      params: {
        ref: branchRef,
      },
      headers,
    }
  )
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

  const {
    data: { tree: gitTree },
  } = await axios.get(
    `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/trees/${treeSha}`,
    {
      params,
      headers,
    }
  )

  return gitTree
}

// send the new tree object back to Github and point the latest commit on the staging branch to it
async function sendTree(
  gitTree,
  currentCommitSha,
  repo,
  accessToken,
  message,
  branchRef = "staging"
) {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: "application/json",
  }
  const resp = await axios.post(
    `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/trees`,
    {
      tree: gitTree,
    },
    {
      headers,
    }
  )

  const {
    data: { sha: newTreeSha },
  } = resp

  const baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/refs`
  const baseCommitEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/commits`
  const refEndpoint = `${baseRefEndpoint}/heads/${branchRef}`

  const newCommitResp = await axios.post(
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
  await axios.patch(
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
    Accept: "application/json",
  }

  const baseRefEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${repo}/git/refs`
  const refEndpoint = `${baseRefEndpoint}/heads/${branchRef}`

  /**
   * The `staging` branch reference will now point to `currentCommitSha`
   */
  await axios.patch(
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
  deslugifyCollectionName,
  getCommitAndTreeSha,
  getTree,
  sendTree,
  revertCommit,
}
