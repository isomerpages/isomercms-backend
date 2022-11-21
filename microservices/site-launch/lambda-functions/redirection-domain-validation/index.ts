/* eslint-disable import/prefer-default-export */ // todo fix default export

import { Octokit } from "@octokit/rest"
import { MessageBody } from "@root/services/identity/QueueService"

import logger from "../../shared/logger"

export const redirectionDomainValidation = async (
  event: Pick<
    MessageBody,
    "redirectionDomain" | "primaryDomainTarget" | "primaryDomainSource"
  >
) => {
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
      branch: "test/redirectionLambdaTest",
    }
  )
  logger.info(
    `status of redirecion commit for ${primaryDomainSource}:\n ${response}`
  )
}
