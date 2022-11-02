/* eslint-disable import/prefer-default-export */ // todo fix default export

import { Octokit } from "@octokit/rest"

import logger from "../../shared/logger"


export interface MessageBody {
  repoName: string
  appId: string
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  requestorEmail: string
  agencyEmail: string
  githubRedirectionUrl?: string
  redirectionDomain?: [
    {
      source: string
      target: string
      type: string
    }
  ]
  success?: boolean
  siteLaunchError?: string
}
export const redirectionDomainValidation = async (
  event: Pick<
    MessageBody,
    "redirectionDomain" | "primaryDomainTarget" | "primaryDomainSource"
  >
) => {
  const DEFAULT_BRANCH = "test/redirectionLambdaTest" // todo change to master in the future.

  // Validation check
  const { primaryDomainSource, redirectionDomain } = event

  const githubRedirects = redirectionDomain?.filter(
    (redirection) => redirection.type === "A"
  )

  // Check if redirection is needed
  if (!githubRedirects?.length) return

  /**
   * Note : This only supports one specific
   * redirection of blah.gov.sg -> www.blah.gov.sg
   * The params of `MessageBody` is designed to handle more complicated
   * redirections for future extensions.
   * */

  const githubRedirect = githubRedirects[0] // only handling blah.gov.sg -> www.blah.gov.sg
  const template = `server {
      listen          443 ssl http2;
      listen          [::]:443 ssl http2;
      server_name     ${primaryDomainSource};
      ssl_certificate /etc/letsencrypt/live/${primaryDomainSource}/fullchain.pem;
      ssl_certificate_key     /etc/letsencrypt/live/${primaryDomainSource}/privkey.pem;
      return          301 https://${githubRedirect.source}$request_uri;
  }`

  const octokit = new Octokit({
    auth: process.env.SYSTEM_GITHUB_TOKEN,
  })

  let fileExists = true
  // see if domain commit in github first. If exists, dont create commit.
  try {
    await octokit.request(
      `GET /repos/isomerpages/isomer-redirection/contents/letsencrypt/${primaryDomainSource}.conf`,
      {
        owner: "isomerpages",
        repo: "isomer-redirection",
        path: "letsencrypt/.",
        ref: DEFAULT_BRANCH,
      }
    )
  } catch (fileFoundError) {
    fileExists = false
  }
  if (fileExists) return

  const response = await octokit.request(
    `PUT /repos/isomerpages/isomer-redirection/contents/letsencrypt/${primaryDomainSource}.conf`,
    {
      owner: "isomerpages",
      repo: "isomer-redirection",
      path: "letsencrypt/.",
      message: `Create ${primaryDomainSource}.conf`,
      committer: {
        name: "isomeradmin",
        email: "isomeradmin@open.gov.sg",
      },
      content: Buffer.from(template, "binary").toString("base64"),
      branch: DEFAULT_BRANCH,
    }
  )
  logger.info(
    `status of redirecion commit for ${primaryDomainSource}:\n ${response}`
  )
}
