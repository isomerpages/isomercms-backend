/* eslint-disable import/prefer-default-export */ // todo fix default export

import { RequestError } from "@octokit/request-error"
import { Octokit } from "@octokit/rest"

import logger from "../../shared/logger"
import { MessageBody } from "../../shared/types"

export const redirectionDomainValidation = async (
  event: Pick<
    MessageBody,
    "redirectionDomain" | "primaryDomainTarget" | "primaryDomainSource"
  >
) => {
  // we push to staging + do a manual PR to master since we want CICD to run and pass in staging
  // rather than having directly committing to master.
  const DEFAULT_BRANCH =
    process.env.NODE_ENV === "prod" ? "staging" : "test/redirectionLambdaTest"
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
   * redirects for future extensions.
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
  // see if domain commit in github first. If exists, don't create commit.

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
  } catch (error: unknown) {
    if (error instanceof RequestError && error.status && error.status === 404) {
      fileExists = false
    } else {
      throw Error(
        `Unknown error when checking for file existence of ${primaryDomainSource}.conf: ${error}`
      )
    }
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
    `status of redirection commit for ${primaryDomainSource}:\n ${response}`
  )
}
