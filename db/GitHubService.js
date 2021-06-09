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

const Update = async () => {

}

const Delete = async () => {

}

module.exports = {
    Read,
}