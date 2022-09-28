import { SubDomainSettings } from "aws-sdk/clients/amplify"

import { Site } from "@database/models"
import { User } from "@database/models/User"
import { SiteStatus, JobStatus } from "@root/constants"
import logger from "@root/logger/logger"
import DeploymentsService from "@services/identity/DeploymentsService"
import LaunchesService from "@services/identity/LaunchesService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"

interface InfraServiceProps {
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
  launchesService: LaunchesService
}

export default class InfraService {
  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  private readonly launchesService: InfraServiceProps["launchesService"]

  constructor({
    sitesService,
    reposService,
    deploymentsService,
    launchesService,
  }: InfraServiceProps) {
    this.sitesService = sitesService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
    this.launchesService = launchesService
  }

  createSite = async (
    submissionId: string,
    creator: User,
    siteName: string,
    repoName: string
  ) => {
    let site: Site | undefined // For error handling
    try {
      // 1. Create a new site record in the Sites table
      const newSiteParams = {
        name: siteName,
        apiTokenName: "", // TODO: figure this out
        creator,
        creatorId: creator.id,
      }
      site = await this.sitesService.create(newSiteParams)
      logger.info(`Created site record in database, site ID: ${site.id}`)

      // 2. Set up GitHub repo and branches using the ReposService
      const repo = await this.reposService.setupGithubRepo({ repoName, site })
      logger.info(`Created repo in GitHub, repo name: ${repoName}`)

      // 3. Set up the Amplify project using the DeploymentsService
      const deployment = await this.deploymentsService.setupAmplifyProject({
        repoName,
        site,
      })
      logger.info(`Created deployment in AWS Amplify, repo name: ${repoName}`)

      // 4. Set Amplify deployment URLs in repo
      await this.reposService.modifyDeploymentUrlsOnRepo(
        repoName,
        deployment.productionUrl,
        deployment.stagingUrl
      )

      // 5. Set up permissions
      await this.reposService.setRepoAndTeamPermissions(repoName)

      // 6. Update status
      const updateSuccessSiteInitParams = {
        id: site.id,
        siteStatus: SiteStatus.Initialized,
        jobStatus: JobStatus.Ready,
      }
      await this.sitesService.update(updateSuccessSiteInitParams)
      logger.info(`Successfully created site on Isomer, site ID: ${site.id}`)

      return { site, repo, deployment }
    } catch (err) {
      if (site !== undefined) {
        const updateFailSiteInitParams = {
          id: site.id,
          jobStatus: JobStatus.Failed,
        }
        await this.sitesService.update(updateFailSiteInitParams)
      }
      logger.error(`Failed to created '${repoName}' site on Isomer: ${err}`)
      throw err
    }
  }

  launchSite = async (
    submissionId: string,
    requestor: User,
    agency: User,
    repoName: string,
    primaryDomain: string,
    subDomainSettings: SubDomainSettings,
    redirectionDomain?: string
  ) => {
    // call amplify to trigger site launch process
    try {
      const newDomainAssociationParams = {}

      // Set up domain association using LaunchesService
      const launch = await this.launchesService.configureDomainInAmplify(
        repoName,
        primaryDomain,
        subDomainSettings
      )
      logger.info(
        `Created Domain association for ${repoName} to ${primaryDomain}`
      )
      console.log(launch)

      // Get DNS records from Amplify
    } catch (error) {
      logger.error(`Failed to created '${repoName}' site on Isomer: ${error}`)
      throw error
    }

    return null
  }
}
