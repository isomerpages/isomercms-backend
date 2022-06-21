import fs from "fs"

import { Octokit } from "@octokit/rest"
import { GetResponseTypeFromEndpointMethod } from "@octokit/types"
import git from "isomorphic-git"
import http from "isomorphic-git/http/node"
import { ModelStatic } from "sequelize"

import { Repo, Site } from "@database/models"

const { SYSTEM_GITHUB_TOKEN } = process.env
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
  // that the types are synced.
  private readonly repository: ReposServiceProps["repository"]

  constructor({ repository }: ReposServiceProps) {
    this.repository = repository
  }

  create = async (createParams: repoCreateParamsType): Promise<Repo | null> =>
    this.repository.create(createParams)

  setupGithubRepo = async ({
    repoName,
    site,
  }: {
    repoName: string
    site: Site
  }): Promise<Repo | null> => {
    const repoUrl = `https://github.com/isomerpages/${repoName}`

    await this.createRepoOnGithub(repoName)
    await this.createTeamOnGitHub(repoName)
    await this.generateRepoAndPublishToGitHub(repoName, repoUrl)
    await this.setRepoAndTeamPermissions(repoName)
    return this.create({
      name: repoName,
      url: repoUrl,
      site,
      siteId: site.id,
    })
  }

  createRepoOnGithub = async (
    repoName: string
  ): Promise<octokitCreateRepoInOrgResponseType> =>
    octokit.repos.createInOrg({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      name: repoName,
      private: false,
    })

  createTeamOnGitHub = async (
    repoName: string
  ): Promise<octokitCreateTeamResponseType> =>
    octokit.teams.create({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      name: repoName,
      privacy: "closed",
    })

  setRepoAndTeamPermissions = async (repoName: string): Promise<void> => {
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
    await octokit.teams.addOrUpdateRepoPermissionsInOrg({
      org: ISOMER_GITHUB_ORGANIZATION_NAME,
      team_slug: repoName,
      owner: ISOMER_GITHUB_ORGANIZATION_NAME,
      repo: repoName,
      permission: "push",
    })
  }

  generateRepoAndPublishToGitHub = async (
    repoName: string,
    repoUrl: string
  ): Promise<void> => {
    // Clone base repo to `/tmp/${repoName}`
    const dir = `/tmp/${repoName}`

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
      corsProxy: "https://cors.isomorphic-git.org",
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
}
