import fs from "fs"

import { Octokit } from "@octokit/rest"
// eslint-disable-next-line import/no-extraneous-dependencies
import { GetResponseTypeFromEndpointMethod } from "@octokit/types"
import git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import { ResultAsync, errAsync, okAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import { config } from "@config/config"

import { UnprocessableError } from "@errors/UnprocessableError"

import { Repo, Site } from "@database/models"
import { DNS_INDIRECTION_REPO } from "@root/constants"
import GitHubApiError from "@root/errors/GitHubApiError"
import logger from "@root/logger/logger"

const SYSTEM_GITHUB_TOKEN = config.get("github.systemToken")
const octokit = new Octokit({ auth: SYSTEM_GITHUB_TOKEN })

// Constants
const SITE_CREATION_BASE_REPO_URL =
  "https://github.com/isomerpages/site-creation-base"
const ISOMER_GITHUB_ORGANIZATION_NAME = "isomerpages"

interface ReposServiceProps {
  repository: ModelStatic<Repo>
}

type octokitCreateTeamResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokit.teams.create
>
type octokitCreateRepoInOrgResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokit.repos.createInOrg
>

type repoCreateParamsType = Partial<Repo> & {
  name: Repo["name"]
  url: Repo["url"]
  site: Repo["site"]
  siteId: Repo["siteId"]
}
export default class ReposService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced. Types can be omitted altogether
  // if they are assigned from the constructor's props parameter,
  // but having this seems to help navigation in some editors.
  private readonly repository: ReposServiceProps["repository"]

  constructor({ repository }: ReposServiceProps) {
    this.repository = repository
  }

  getLocalRepoPath = (repoName: string) => `/tmp/${repoName}`

  create = (createParams: repoCreateParamsType): Promise<Repo> =>
    this.repository.create(createParams)

  setupGithubRepo = async ({
    repoName,
    site,
    isEmailLogin,
  }: {
    repoName: string
    site: Site
    isEmailLogin: boolean
  }): Promise<Repo> => {
    const repoUrl = `https://github.com/isomerpages/${repoName}`

    await this.createRepoOnGithub(repoName)
    if (!isEmailLogin) {
      await this.createTeamOnGitHub(repoName)
    }
    await this.generateRepoAndPublishToGitHub(repoName, repoUrl)
    return this.create({
      name: repoName,
      url: repoUrl,
      site,
      siteId: site.id,
    })
  }

  createTeamOnGitHub = (
    repoName: string
  ): Promise<octokitCreateTeamResponseType> =>
    octokit.teams.create({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      name: repoName,
      privacy: "closed",
    })

  modifyDeploymentUrlsOnRepo = async (
    repoName: string,
    productionUrl: string,
    stagingUrl: string
  ) => {
    const dir = this.getLocalRepoPath(repoName)

    // 1. Set URLs in local _config.yml
    this.setUrlsInLocalConfig(dir, repoName, stagingUrl, productionUrl)

    // 2. Commit changes in local repo
    await git.add({ fs, dir, filepath: "." })
    await git.commit({
      fs,
      dir,
      message: "Set URLs",
      author: {
        name: ISOMER_GITHUB_ORGANIZATION_NAME,
        email: "isomeradmin@users.noreply.github.com",
      },
    })

    // 3. Push changes to staging branch
    const remote = "origin"
    await git.push({
      fs,
      http,
      dir,
      remote,
      remoteRef: "staging",
      onAuth: () => ({ username: "user", password: SYSTEM_GITHUB_TOKEN }),
    })

    // 4. Push changes to master branch
    await git.push({
      fs,
      http,
      dir,
      remote,
      remoteRef: "master",
      onAuth: () => ({ username: "user", password: SYSTEM_GITHUB_TOKEN }),
    })
  }

  private setUrlsInLocalConfig(
    dir: string,
    repoName: string,
    stagingUrl: string,
    productionUrl: string
  ) {
    const configPath = `${dir}/_config.yml`
    const configFile = fs.readFileSync(configPath, "utf-8")
    const lines = configFile.split("\n")
    const stagingIdx = lines.findIndex((line) => line.startsWith("staging:"))
    const prodIdx = lines.findIndex((line) => line.startsWith("prod:"))
    if (stagingIdx === -1 || prodIdx === -1) {
      throw new UnprocessableError(
        `'${repoName}' _config.yml must have lines that begin with 'staging:' and 'prod:'`
      )
    }
    lines[stagingIdx] = `staging: ${stagingUrl}`
    lines[prodIdx] = `prod: ${productionUrl}`
    fs.writeFileSync(configPath, lines.join("\n"))
  }

  createRepoOnGithub = (
    repoName: string
  ): Promise<octokitCreateRepoInOrgResponseType> =>
    octokit.repos.createInOrg({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      name: repoName,
      private: false,
      allow_squash_merge: false,
    })

  setRepoAndTeamPermissions = async (
    repoName: string,
    isEmailLogin: boolean
  ): Promise<void> => {
    await octokit.repos.updateBranchProtection({
      owner: ISOMER_GITHUB_ORGANIZATION_NAME,
      repo: repoName,
      branch: "master",
      required_pull_request_reviews: {
        required_approving_review_count: 1,
      },
      enforce_admins: true,
      required_status_checks: null,
      restrictions: null,
      // Enable custom media type to enable required_pull_request_reviews
      headers: {
        accept: "application/vnd.github.luke-cage-preview+json",
      },
    })
    await octokit.teams.addOrUpdateRepoPermissionsInOrg({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      team_slug: "core",
      owner: ISOMER_GITHUB_ORGANIZATION_NAME,
      repo: repoName,
      permission: "admin",
    })
    if (!isEmailLogin) {
      await octokit.teams.addOrUpdateRepoPermissionsInOrg({
        org: ISOMER_GITHUB_ORGANIZATION_NAME,
        team_slug: repoName,
        owner: ISOMER_GITHUB_ORGANIZATION_NAME,
        repo: repoName,
        permission: "push",
      })
    }
  }

  generateRepoAndPublishToGitHub = async (
    repoName: string,
    repoUrl: string
  ): Promise<void> => {
    const dir = this.getLocalRepoPath(repoName)

    // Make sure the local path is empty, just in case dir was used on a previous attempt.
    fs.rmSync(`${dir}`, { recursive: true, force: true })

    // Clone base repo locally
    await git.clone({
      fs,
      http,
      dir,
      ref: "staging",
      singleBranch: true,
      url: SITE_CREATION_BASE_REPO_URL,
      depth: 1,
    })

    // Clear git
    fs.rmSync(`${dir}/.git`, { recursive: true, force: true })

    // Prepare git repo
    await git.init({ fs, dir, defaultBranch: "staging" })
    await git.add({ fs, dir, filepath: "." })
    await git.commit({
      fs,
      dir,
      message: "Initial commit",
      author: {
        name: "isomeradmin",
        email: "isomeradmin@users.noreply.github.com",
      },
    })

    const remote = "origin"
    const addRemoteConfig = {
      fs,
      dir,
      remote,
      url: repoUrl,
    }
    await git.addRemote(addRemoteConfig)

    // Push contents, staging first then master,
    // so that staging is default branch
    const repoPushConfig = {
      fs,
      http,
      dir,
      remote,
      onAuth: () => ({ username: "user", password: SYSTEM_GITHUB_TOKEN }),
    }
    await git.push({
      ...repoPushConfig,
      remoteRef: "staging",
    })
    await git.push({
      ...repoPushConfig,
      remoteRef: "master",
    })
  }

  createDnsIndirectionFile = (
    indirectionSubdomain: string,
    primaryDomain: string,
    primaryDomainTarget: string
  ): ResultAsync<void, GitHubApiError> => {
    const template = `import { Record } from "@pulumi/aws/route53";
import { CLOUDFRONT_HOSTED_ZONE_ID } from "../constants";

export const createRecords = (zoneId: string): Record[] => {
  const records = [
    new Record("${primaryDomain} A", {
      name: "${indirectionSubdomain}",
      type: "A",
      zoneId: zoneId,
      aliases: [
        {
          name: "${primaryDomainTarget}",
          zoneId: CLOUDFRONT_HOSTED_ZONE_ID,
          evaluateTargetHealth: false,
        },
      ],
    }),

    new Record("${primaryDomain} AAAA", {
      name: "${indirectionSubdomain}",
      type: "AAAA",
      zoneId: zoneId,
      aliases: [
        {
          name: "${primaryDomainTarget}",
          zoneId: CLOUDFRONT_HOSTED_ZONE_ID,
          evaluateTargetHealth: false,
        },
      ],
    }),
  ];

  return records;
};
`

    return ResultAsync.fromPromise(
      octokit.repos.getContent({
        owner: ISOMER_GITHUB_ORGANIZATION_NAME,
        repo: DNS_INDIRECTION_REPO,
        path: `dns/${primaryDomain}.ts`,
      }),
      () => errAsync<true>(true)
    )
      .andThen((response) => {
        if (Array.isArray(response.data)) {
          logger.error(
            `Error creating DNS indirection file for ${primaryDomain}`
          )

          return errAsync(
            new GitHubApiError("Unable to create DNS indirection file")
          )
        }

        const { sha } = response.data
        return okAsync(sha)
      })
      .andThen((sha) =>
        ResultAsync.fromPromise(
          octokit.repos.createOrUpdateFileContents({
            owner: ISOMER_GITHUB_ORGANIZATION_NAME,
            repo: DNS_INDIRECTION_REPO,
            path: `dns/${primaryDomain}.ts`,
            message: `Update ${primaryDomain}.ts`,
            content: Buffer.from(template).toString("base64"),
            sha,
          }),
          (error) => {
            logger.error(
              `Error creating DNS indirection file for ${primaryDomain}: ${error}`
            )

            return new GitHubApiError("Unable to create DNS indirection file")
          }
        )
      )
      .orElse((error) => {
        if (error instanceof GitHubApiError) {
          return errAsync(error)
        }

        return ResultAsync.fromPromise(
          octokit.repos.createOrUpdateFileContents({
            owner: ISOMER_GITHUB_ORGANIZATION_NAME,
            repo: DNS_INDIRECTION_REPO,
            path: `dns/${primaryDomain}.ts`,
            message: `Create ${primaryDomain}.ts`,
            content: Buffer.from(template).toString("base64"),
          }),
          (error) => {
            logger.error(
              `Error creating DNS indirection file for ${primaryDomain}: ${error}`
            )

            return new GitHubApiError("Unable to create DNS indirection file")
          }
        )
      })
      .map(() => undefined)
  }
}
