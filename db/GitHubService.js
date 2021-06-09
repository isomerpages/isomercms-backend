const axios = require('axios')
const validateStatus = require("@utils/axios-utils")

const BRANCH_REF = "staging"
const { GITHUB_ORG_NAME } = process.env

const axiosInstance = axios.create({
    baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})

axiosInstance.interceptors.request.use((config) => ({
    ...config,
    headers: {
        ...config.headers,
        "Content-Type": "application/json",
    }
}))

const Create = async () => {

}

const Read = async ({ accessToken, url }) => {
    const params = {
        ref: undefined,
    }
    
    return axiosInstance.get(url, {
        validateStatus,
        params,
        headers: {
          Authorization: `token ${accessToken}`,
        },
    })
}

const Update = async ({ accessToken, fileContent, sha, url }) => {
    const params = {
        message: `Update file: ${url}`,
        content: fileContent,
        branch: BRANCH_REF,
        sha,
    }

    return axiosInstance.put(url, params, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
    })
}

const Delete = async () => {

}

const GetRepoState = async ({ isRecursive }, { accessToken, siteName, treeSha }) => {
    const url = `${siteName}/git/trees/${treeSha}`

    const params = {
        ref: BRANCH_REF,
    }

    if (isRecursive) params.recursive = true

    const {data: { tree: gitTree } } = await axiosInstance.get(url, { params, headers: { Authorization: `token ${accessToken}` } })
    
    return gitTree
}

const UpdateRepoState = async ({ gitTree, message }, { accessToken, currentCommitSha, siteName }) => {
    const url = `${siteName}/git/trees`
    const branchRef = "staging"

    const headers = {
        Authorization: `token ${accessToken}`,
    }

    const resp = await axiosInstance.post(url, { tree: gitTree }, { headers })
    
    const {
      data: { sha: newTreeSha },
    } = resp
    
    const commitEndpoint = `${siteName}/git/commits`
    const refEndpoint = `${siteName}/git/refs/heads/${branchRef}`
    
    const newCommitResp = await axiosInstance.post(commitEndpoint, {
            message: message || `isomerCMS updated ${siteName} state`,
            tree: newTreeSha,
            parents: [currentCommitSha],
        }, { headers })
    
    const newCommitSha = newCommitResp.data.sha

    console.log(currentCommitSha, "CURRENT COMMIT SHA")
    
    /**
     * The `staging` branch reference will now point
     * to `newCommitSha` instead of `currentCommitSha`
     */
    await axiosInstance.patch(refEndpoint, { sha: newCommitSha, force: true }, { headers })
}


module.exports = {
    Read,
    Update,
    GetRepoState,
    UpdateRepoState,
}