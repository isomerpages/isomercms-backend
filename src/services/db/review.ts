import _ from "lodash"

import {
  RawFileChangeInfo,
  Commit,
  RawPullRequest,
  RawComment,
} from "@root/types/github"

import { isomerRepoAxiosInstance as axiosInstance } from "../api/AxiosInstance"

const { E2E_TEST_GH_TOKEN } = process.env

export const getCommitDiff = async (
  siteName: string,
  base = "master",
  head = "staging"
) =>
  axiosInstance
    .get<{ files: RawFileChangeInfo[]; commits: Commit[] }>(
      `${siteName}/compare/${base}...${head}`
    )
    .then(({ data }) => data)

export const createPullRequest = (
  siteName: string,
  title: string,
  description?: string,
  base = "master",
  head = "staging"
) =>
  axiosInstance
    .post<{ number: number }>(
      `${siteName}/pulls`,
      // NOTE: only create body if a valid description is given
      { title, base, head, ...(description && { body: description }) }
    )
    .then(({ data }) => data.number)

export const getPullRequest = (siteName: string, pullRequestNumber: number) =>
  axiosInstance
    .get<RawPullRequest>(`${siteName}/pulls/${pullRequestNumber}`)
    .then(({ data }) => data)

export const updatePullRequest = (
  siteName: string,
  pullRequestNumber: number,
  title: string,
  description?: string
) =>
  axiosInstance.patch<void>(
    `${siteName}/pulls/${pullRequestNumber}`,
    // NOTE: only create body if a valid description is given
    { title, ...(description !== undefined && { body: description }) }
  )

export const closeReviewRequest = (
  siteName: string,
  pullRequestNumber: number
) =>
  axiosInstance.patch<void>(
    `${siteName}/pulls/${pullRequestNumber}`,
    // NOTE: only create body if a valid description is given
    { state: "closed" }
  )

export const mergePullRequest = (siteName: string, pullRequestNumber: number) =>
  axiosInstance.put<void>(`${siteName}/pulls/${pullRequestNumber}/merge`)

export const approvePullRequest = (
  siteName: string,
  pullRequestNumber: number
) =>
  axiosInstance.post<void>(
    `${siteName}/pulls/${pullRequestNumber}/reviews`,
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

export const getComments = async (
  siteName: string,
  pullRequestNumber: number
) => {
  const rawComments = await axiosInstance
    .get<RawComment[]>(`${siteName}/issues/${pullRequestNumber}/comments`)
    .then(({ data }) => data)
  return _.compact(
    rawComments.map((rawComment) => {
      try {
        const commentData = JSON.parse(rawComment.body)
        const { user, message } = commentData
        return {
          user,
          message,
          createdAt: rawComment.created_at,
        }
      } catch (e) {
        // Not properly formatted comment, ignore
        return null
      }
    })
  )
}

export const createComment = async (
  siteName: string,
  pullRequestNumber: number,
  user: string,
  message: string
) => {
  const stringifiedMessage = JSON.stringify({
    user,
    message,
  })
  return axiosInstance.post<void>(
    `${siteName}/issues/${pullRequestNumber}/comments`,
    { body: stringifiedMessage }
  )
}
