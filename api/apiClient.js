import axios from 'axios'

const { GITHUB_ORG_NAME } = process.env
const { BRANCH_REF } = process.env

const API_BASE_URL = `https://api.github.com/repos/${GITHUB_ORG_NAME}`

export const getApiErrorMessage = (error) => {
  const defaultErrMsg = 'Something went wrong'
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data.message ??
      error.response?.statusText ??
      defaultErrMsg
    )
  }

  if (error instanceof Error) {
    return error.message ?? defaultErrMsg
  }

  return defaultErrMsg
}

export const ApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000, // 100 secs
  params: {
    branch: BRANCH_REF,
  },
  headers: {
    "Content-Type": "application/json",
  }
})
