import { SubDomainSettings } from "aws-sdk/clients/amplify"

import { Site } from "@database/models"
import { User } from "@database/models/User"
import { MessageBody } from "@root/../microservices/site-launch/shared/types"
import { SiteStatus, JobStatus } from "@root/constants"
import logger from "@root/logger/logger"
import DeploymentsService from "@services/identity/DeploymentsService"
import LaunchesService, {
  launchesCreateParamsType,
} from "@services/identity/LaunchesService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"

import QueueService from "../identity/QueueService"
import { mailer } from "../utilServices/MailClient"

const SITE_LAUNCH_UPDATE_INTERVAL = 30000
export const REDIRECTION_SERVER_IP = "18.136.36.203"

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

  parseDNSRecords = (record?: string) => {
    if (!record) {
      return undefined
    }

    // Note: the records would have the shape of 'blah.gov.sg CNAME blah.validaations.aws'
    const recordsInfo = record.split(" ")
    return {
      source: recordsInfo[0],
      target: recordsInfo[2],
      type: recordsInfo[1],
    }
  }

  isRootDomain = (primaryDomain: string) => {
    // method to differentiate root domains with 4th level domains
    if ((primaryDomain.match(/\./g) || []).length < 3) {
      // eg. blah.gov.sg
      return true
    }
    return false
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

      const certificationRecord = this.parseDNSRecords(
        dnsInfo.domainAssociation?.certificateVerificationDNSRecord
      )
      if (!certificationRecord) {
        throw new Error(`error while parsing ${dnsInfo}`)
      }

      const domainValidationSource = certificationRecord.source
      const domainValidationTarget = certificationRecord.target

      const subDomainList = dnsInfo.domainAssociation?.subDomains
      if (!subDomainList || !subDomainList[0].dnsRecord) {
        throw Error("subdomain list not created yet")
      }

      const primaryDomainInfo = this.parseDNSRecords(subDomainList[0].dnsRecord)

      if (!primaryDomainInfo) {
        throw Error("primary domain info not created yet")
      }

      /**
       * shape of dnsInfo.domainAssociation.subDomains:
       * {
       *   dnsRecord: "CNAME gibberish.cloudfront.net",
       *   subDomainSettings: {
       *     branchName : "master",
       *     prefix? : "www"
       *   }
       * }
       */

      const primaryDomainTarget = primaryDomainInfo.target
      const redirectionDomainList = dnsInfo.domainAssociation?.subDomains?.filter(
        (subDomain) => subDomain.subDomainSetting?.prefix
      )

      /**
       * Amplify only stores the prefix.
       * ie: if I wanted to have a www.blah.gov.sg -> giberish.cloudfront.net,
       * amplify will store the prefix as "www". To get the entire redirectionDomainSource,
       * I would have to add the prefix ("www") with the primary domain (blah.gov.sg)
       */
      const userId = agency.id
      const newLaunchParams: launchesCreateParamsType = {
        userId,
        siteId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
      }

      if (redirectionDomainList?.length) {
        newLaunchParams.redirectionDomainSource = `${redirectionDomainList[0].subDomainSetting?.prefix}.${primaryDomain}`
      }

      // Create launches records table
      const launchesRecord = await this.launchesService.createOrUpdate(
        newLaunchParams
      )
      logger.info(`Created launch record in database:  ${launchesRecord}`)

      const message: MessageBody = {
        repoName,
        appId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
        requestorEmail: requestor.email ? requestor.email : "",
        agencyEmail: agency.email ? agency.email : "", // TODO: remove conditional after making email not optional/nullable
      }

      if (redirectionDomain) {
        message.redirectionDomain = [
          {
            source: redirectionDomain,
            target: this.isRootDomain(primaryDomain)
              ? REDIRECTION_SERVER_IP
              : primaryDomainTarget,
            type: this.isRootDomain(primaryDomain) ? "A" : "CNAME",
          },
        ]
      }

      this.queueService.sendMessage(message)

      return newLaunchParams
    } catch (error) {
      logger.error(`Failed to create '${repoName}' site on Isomer: ${error}`)
      this.sendRetryToIsomerAdmin(<string>requestor.email, repoName) // email guarented by model
      throw error
    }
  }

  sendRetryToIsomerAdmin = async (email: string, repoName: string) => {
    const subject = `[Isomer] Failure to create domain association for ${repoName}`
    const body = `<p>Unable to trigger create domain association for ${repoName}.</P
    <p>If domain association was already created, please log into the amplify console and trigger a retry. </p>
    <p>Else, resubmit the form and try again.</p>`
    await mailer.sendMail(email, subject, body)
  }

  siteLaunchUpdate = async () => {
    try {
      const messages = await this.queueService.pollMessages()
      if (messages) {
        messages.forEach(async (message) => {
          const site = await this.sitesService.getBySiteName(message.repoName)
          if (site) {
            const emailDetails: { subject: string; body: string } = {
              subject: "",
              body: "",
            }
            let params
            if (message.success) {
              params = {
                id: site.id,
                siteStatus: SiteStatus.Launched,
                jobStatus: JobStatus.Running,
              }
              emailDetails.subject = `Launch site ${message.repoName} SUCCESS`
              emailDetails.body = `<p>Isomer site ${message.repoName} was launched successfully.</p>
              <p>You may now visit your live website. <a href="${message.primaryDomainSource}">${message.primaryDomainSource}</a> should be accessible within a few minutes.</p>
              <p>This email was sent from the Isomer CMS backend.</p>`
            } else {
              params = { id: site.id, jobStatus: JobStatus.Failed }
              emailDetails.subject = `Launch site ${message.repoName} FAILURE`
              emailDetails.body = `<p>Isomer site ${message.repoName} was not launched successfully.</p>
              <p>Error: ${message.siteLaunchError}</p>
              <p>This email was sent from the Isomer CMS backend.</p>
              `
            }
            await this.sitesService.update(params)
            if (this.isMOEEmail(message.agencyEmail)) {
              await mailer.sendMail(
                message.agencyEmail,
                emailDetails.subject,
                emailDetails.body
              )
            }
            await mailer.sendMail(
              message.requestorEmail,
              emailDetails.subject,
              emailDetails.body
            )
          }
        })
      }
    } catch (error) {
      logger.error(error)
    }
  }

  // special case for MOE folks, not to send email to the agency directly.
  isMOEEmail = (email: string) =>
    email.substring(email.length - 10) === "moe.edu.sg"

  pollQueue = async () => {
    setInterval(this.siteLaunchUpdate, SITE_LAUNCH_UPDATE_INTERVAL)
  }
}
