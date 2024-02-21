import { AxiosError } from "axios"
import _ from "lodash"
import urlTemplate from "url-template"

import { config } from "@config/config"

import {
  RawFileChangeInfo,
  Commit,
  RawPullRequest,
  RawComment,
  fromGithubCommitMessage,
} from "@root/types/github"

import { isomerRepoAxiosInstance as axiosInstance } from "../api/AxiosInstance"

const E2E_TEST_GH_TOKEN = config.get("cypress.e2eTestGithubToken")

export const getCommitDiff = async (
  siteName: string,
  base = "master",
  head = "staging"
) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/compare/{base}...{head}`
  )
  const endpoint = endpointTemplate.expand({ siteName, base, head })
  return axiosInstance
    .get<{ files: RawFileChangeInfo[]; commits: Commit[] }>(endpoint)
    .then(({ data }) => data)
}

export const createPullRequest = (
  siteName: string,
  title: string,
  description?: string,
  base = "master",
  head = "staging"
) => {
  const endpointTemplate = urlTemplate.parse(`{siteName}/pulls`)
  const endpoint = endpointTemplate.expand({ siteName })
  return axiosInstance
    .post<{ number: number }>(
      endpoint,
      // NOTE: only create body if a valid description is given
      { title, base, head, ...(description && { body: description }) }
    )
    .then(({ data }) => data.number)
}

export const getPullRequest = (siteName: string, pullRequestNumber: number) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/pulls/{pullRequestNumber}`
  )
  const endpoint = endpointTemplate.expand({ siteName, pullRequestNumber })
  return axiosInstance.get<RawPullRequest>(endpoint).then(({ data }) => data)
}

export const updatePullRequest = (
  siteName: string,
  pullRequestNumber: number,
  title: string,
  description?: string
) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/pulls/{pullRequestNumber}`
  )
  const endpoint = endpointTemplate.expand({ siteName, pullRequestNumber })
  return axiosInstance.patch<void>(
    endpoint,
    // NOTE: only create body if a valid description is given
    { title, ...(description !== undefined && { body: description }) }
  )
}

export const closeReviewRequest = (
  siteName: string,
  pullRequestNumber: number
) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/pulls/{pullRequestNumber}`
  )
  const endpoint = endpointTemplate.expand({ siteName, pullRequestNumber })
  return axiosInstance.patch<void>(
    endpoint,
    // NOTE: only create body if a valid description is given
    { state: "closed" }
  )
}

export const mergePullRequest = (
  repoNameInGithub: string,
  pullRequestNumber: number
) => {
  const endpointTemplate = urlTemplate.parse(
    `{repoNameInGithub}/pulls/{pullRequestNumber}/merge`
  )
  const endpoint = endpointTemplate.expand({
    repoNameInGithub,
    pullRequestNumber,
  })
  return axiosInstance.put<void>(endpoint)
}

export const approvePullRequest = (
  repoNameInGithub: string,
  pullRequestNumber: number
) => {
  const endpointTemplate = urlTemplate.parse(
    `{repoNameInGithub}/pulls/{pullRequestNumber}/reviews`
  )
  const endpoint = endpointTemplate.expand({
    repoNameInGithub,
    pullRequestNumber,
  })
  return axiosInstance.post<void>(
    endpoint,
    {
      event: "APPROVE",
    },
    {
      headers: {
        // NOTE: This is currently done because
        // we have a lock on the master branch
        // and github requires an approval from
        // *another* account that is not the creator
        // of the pull request.
        // This is a temporary workaround until we
        // write a migration script to remove the lock on master.
        // TODO!: Remove this
        Authorization: `token ${E2E_TEST_GH_TOKEN}`,
      },
    }
  )
}

export const getComments = async (
  siteName: string,
  pullRequestNumber: number
) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/issues/{pullRequestNumber}/comments`
  )
  const endpoint = endpointTemplate.expand({ siteName, pullRequestNumber })
  const rawComments = await axiosInstance
    .get<RawComment[]>(endpoint)
    .then(({ data }) => data)
  return _.compact(
    rawComments.map((rawComment) => {
      const commentData = fromGithubCommitMessage(rawComment.body)
      if (_.isEmpty(commentData)) return null // Will be filtered out by _.compact
      const { userId, message } = commentData
      if (!userId || !message) return null // Will be filtered out by _.compact
      return {
        userId,
        message,
        createdAt: rawComment.created_at,
      }
    })
  )
}

export const createComment = async (
  siteName: string,
  pullRequestNumber: number,
  userId: string,
  message: string
) => {
  const endpointTemplate = urlTemplate.parse(
    `{siteName}/pulls/{pullRequestNumber}/comments`
  )
  const endpoint = endpointTemplate.expand({ siteName, pullRequestNumber })
  const stringifiedMessage = JSON.stringify({
    userId,
    message,
  })
  return axiosInstance.post<void>(endpoint, { body: stringifiedMessage })
}

export const getBlob = async (
  repo: string,
  path: string,
  ref: string
): Promise<string> => {
  const endpointTemplate = urlTemplate.parse(`{repo}/contents/{path}?ref={ref}`)
  const endpoint = endpointTemplate.expand({ repo, path, ref })
  return axiosInstance
    .get<string>(endpoint, {
      headers: {
        Accept: "application/vnd.github.raw",
      },
    })
    .catch((err: AxiosError) => {
      // NOTE: This happens when either an existing file in a folder is deleted
      // or when the file is newly created inside a folder.
      // This means that the upstream ref either before/after does not exist
      // and would lead to 404, so we return an empty string instead.
      if (err.isAxiosError && err?.response?.status === 404) return { data: "" }
      throw err
    })
    .then(({ data }) => data)
}
