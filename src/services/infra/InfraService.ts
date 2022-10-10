import { SubDomainSettings } from "aws-sdk/clients/amplify"

import { Site } from "@database/models"
import { User } from "@database/models/User"
import { SiteStatus, JobStatus } from "@root/constants"
import logger from "@root/logger/logger"
import DeploymentsService from "@services/identity/DeploymentsService"
import LaunchesService from "@services/identity/LaunchesService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"

import QueueService, { MessageBody } from "../identity/QueueService"

interface InfraServiceProps {
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
  launchesService: LaunchesService
  queueService: QueueService
}

export default class InfraService {
  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  private readonly launchesService: InfraServiceProps["launchesService"]

  private readonly queueService: InfraServiceProps["queueService"]

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
    this.queueService = new QueueService()
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
    subDomainSettings: SubDomainSettings
  ) => {
    // call amplify to trigger site launch process
    try {
      // Set up domain association using LaunchesService
      const {
        appId,
        siteId,
      } = await this.launchesService.configureDomainInAmplify(
        repoName,
        primaryDomain,
        subDomainSettings
      )
      logger.info(
        `Created Domain association for ${repoName} to ${primaryDomain}`
      )

      // Get DNS records from Amplify
      const dnsInfo = await this.launchesService.getDomainAssociationRecord(
        primaryDomain,
        appId
      )

      const certificationRecord = dnsInfo.domainAssociation?.certificateVerificationDNSRecord?.split(
        " "
      )

      if (!certificationRecord) {
        throw Error("certification record not created yet")
      }

      const subDomainList = dnsInfo.domainAssociation?.subDomains
      if (!subDomainList || !subDomainList[0].dnsRecord) {
        throw Error("subdomain list not created yet")
      }

      const primaryDomainInfo = subDomainList[0].dnsRecord?.split(" ")
      logger.info(primaryDomainInfo)
      const primaryDomainTarget = primaryDomainInfo[2]
      logger.info(certificationRecord)
      const domainValidationSource = certificationRecord[0]
      const domainValidationTarget = certificationRecord[2]
      const redirectionDomainList = dnsInfo.domainAssociation?.subDomains?.filter(
        (subDomain) => subDomain.subDomainSetting?.prefix
      )
      const redirectionDomainSource = `${redirectionDomainList?.[0].subDomainSetting?.prefix}.${primaryDomain}`

      const userId = agency.id
      const newLaunchParams = {
        userId,
        siteId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
        redirectionDomainSource,
      }

      // Create launches records table
      const launchesRecord = await this.launchesService.create(newLaunchParams)
      logger.info(`Created launch record in database:  ${launchesRecord}`)

      const message: MessageBody = {
        repoName,
        appId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
      }

      if (redirectionDomainSource) {
        message.redirectionDomain = [
          {
            source: redirectionDomainSource,
            target: primaryDomainTarget,
          },
        ]
      }

      this.queueService.sendMessage(message)
    } catch (error) {
      logger.error(`Failed to created '${repoName}' site on Isomer: ${error}`)
      throw error
    }
    return null
  }

  siteUpdate = async () => {
    try {
      const messages = await this.queueService.pollMessages()
      if (messages) {
        messages.forEach(async (message) => {
          const site = await this.sitesService.getBySiteName(message.repoName)
          if (site) {
            const updateSuccessSiteLaunchParams = {
              id: site.id,
              siteStatus: SiteStatus.Launched,
              jobStatus: JobStatus.Running,
            }
            await this.sitesService.update(updateSuccessSiteLaunchParams)
          }
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }

  pollQueue = async () => {
    setInterval(this.siteUpdate, 6000)
  }
}
