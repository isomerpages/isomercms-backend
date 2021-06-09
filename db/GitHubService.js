const axios = require('axios')
const validateStatus = require("@utils/axios-utils")

const { BRANCH_REF } = process.env
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
        ref: BRANCH_REF,
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

module.exports = {
    Read,
    Update,
}