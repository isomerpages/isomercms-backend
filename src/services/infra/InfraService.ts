import { SubDomainSettings } from "aws-sdk/clients/amplify"
import Joi from "joi"
import { Err, err, errAsync, Ok, ok, okAsync, Result } from "neverthrow"

import { config } from "@config/config"

import { Site } from "@database/models"
import { User } from "@database/models/User"
import { SiteLaunchMessage } from "@root/../microservices/site-launch/shared/types"
import { SiteStatus, JobStatus, RedirectionTypes } from "@root/constants"
import logger from "@root/logger/logger"
import { AmplifyError } from "@root/types/amplify"
import DeploymentsService from "@services/identity/DeploymentsService"
import {
  SiteLaunchCreateParams,
  LaunchesService,
} from "@services/identity/LaunchesService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import { mailer } from "@services/utilServices/MailClient"

import CollaboratorsService from "../identity/CollaboratorsService"
import QueueService from "../identity/QueueService"

import DynamoDBService from "./DynamoDBService"
import StepFunctionsService from "./StepFunctionsService"

const SITE_LAUNCH_UPDATE_INTERVAL = 30000
export const REDIRECTION_SERVER_IP = "18.136.36.203"

interface InfraServiceProps {
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
  launchesService: LaunchesService
  queueService: QueueService
  collaboratorsService: CollaboratorsService
  stepFunctionsService: StepFunctionsService
  dynamoDBService: DynamoDBService
}

interface dnsRecordDto {
  source: string
  target: string
  type: RedirectionTypes
}

type CreateSiteParams = {
  creator: User
  // this is ok, since we don't need this for github login flow
  member: User | undefined
  siteName: string
  repoName: string
  isEmailLogin: boolean
}

const DEPRECATE_SITE_QUEUES = config.get(
  "aws.sqs.featureFlags.shouldDeprecateSiteQueues"
)
export default class InfraService {
  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  private readonly launchesService: InfraServiceProps["launchesService"]

  private readonly queueService: InfraServiceProps["queueService"]

  private readonly collaboratorsService: InfraServiceProps["collaboratorsService"]

  private readonly stepFunctionsService: InfraServiceProps["stepFunctionsService"]

  private readonly dynamoDBService: InfraServiceProps["dynamoDBService"]

  constructor({
    sitesService,
    reposService,
    deploymentsService,
    launchesService,
    queueService,
    collaboratorsService,
    stepFunctionsService,
    dynamoDBService,
  }: InfraServiceProps) {
    this.sitesService = sitesService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
    this.launchesService = launchesService
    this.queueService = queueService
    this.collaboratorsService = collaboratorsService
    this.stepFunctionsService = stepFunctionsService
    this.dynamoDBService = dynamoDBService
  }

  createSite = async ({
    creator,
    member,
    siteName,
    repoName,
    isEmailLogin,
  }: CreateSiteParams) => {
    let site: Site | undefined // For error handling
    const memberEmail = member?.email
    const doesMemberEmailExistForEmailLogin = !memberEmail && isEmailLogin
    if (doesMemberEmailExistForEmailLogin) {
      logger.error(
        `createSite: initial member for ${siteName} for email login flow does not have associated email`
      )
      throw new Error(
        `createSite: initial member for ${siteName} for email login flow does not have associated email`
      )
    }
    try {
      // 1. Create a new site record in the Sites table
      const newSiteParams = {
        name: siteName,
        creator,
        creatorId: creator.id,
      }
      site = await this.sitesService.create(newSiteParams)
      logger.info(`Created site record in database, site ID: ${site.id}`)

      // 2. Set up GitHub repo and branches using the ReposService
      const repo = await this.reposService.setupGithubRepo({
        repoName,
        site,
        isEmailLogin,
      })
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
      await this.reposService.setRepoAndTeamPermissions(repoName, isEmailLogin)
      if (isEmailLogin && memberEmail) {
        await this.collaboratorsService.create(repoName, memberEmail, true)
      }
      // 6. Update status
      const updateSuccessSiteInitParams = {
        id: site.id,
        siteStatus: SiteStatus.Initialized,
        jobStatus: JobStatus.Ready,
      }
      await this.sitesService.update(updateSuccessSiteInitParams)
      logger.info(`Successfully created site on Isomer, site ID: ${site.id}`)

      return { site, repo, deployment }
    } catch (error) {
      if (site !== undefined) {
        const updateFailSiteInitParams = {
          id: site.id,
          jobStatus: JobStatus.Failed,
        }
        await this.sitesService.update(updateFailSiteInitParams)
      }
      logger.error(`Failed to created '${repoName}' site on Isomer: ${error}`)
      throw error
    }
  }

  removeTrailingDot = (url: string) => {
    if (url.endsWith(".")) {
      return url.slice(0, -1)
    }
    return url
  }

  isValidUrl(url: string): boolean {
    const schema = Joi.string().domain()
    // joi reports initial "_" for certificates as as an invalid url WRONGLY,
    // therefore check if after removing it, it reports as a valid url
    const extractedUrl = url.startsWith("_") ? url.substring(1) : url
    const { error } = schema.validate(extractedUrl)
    return !error
  }

  parseDNSRecords = (
    record?: string
  ): Err<never, string> | Ok<dnsRecordDto, never> => {
    if (!record) {
      return err(`Record was not defined`)
    }

    // Note: the records would have the shape of 'blah.gov.sg. CNAME blah.validations.aws.'
    const recordsInfo = record.split(" ")

    // type checking
    const sourceUrl = this.removeTrailingDot(recordsInfo[0])

    // For the root domain record, Amplify records this as : ' CNAME gibberish.cloudfront.net',
    // sourceUrl is an empty string in this case.
    // For the www record, Amplify records this as : 'www CNAME gibberish.cloudfront.net',
    // sourceUrl is 'www' in this case.
    // In both cases, the sourceUrl is not a valid url, so we skip the url validation.

    const targetUrl = this.removeTrailingDot(recordsInfo[2])
    if (!this.isValidUrl(targetUrl)) {
      return err(`Target url "${targetUrl}" was not a valid url`)
    }

    let recordType
    if (recordsInfo[1] === "A") {
      recordType = RedirectionTypes.A
    } else if (recordsInfo[1] === "CNAME") {
      recordType = RedirectionTypes.CNAME
    } else {
      return err(`Unknown DNS record type: ${recordsInfo[1]}`)
    }

    const dnsRecord: dnsRecordDto = {
      source: sourceUrl,
      target: targetUrl,
      type: recordType,
    }
    return ok(dnsRecord)
  }

  launchSite = async (
    requestor: User,
    agency: User,
    repoName: string,
    primaryDomain: string,
    subDomainSettings: SubDomainSettings
  ): Promise<Result<SiteLaunchCreateParams, AmplifyError>> => {
    // call amplify to trigger site launch process
    let newLaunchParams: SiteLaunchCreateParams
    try {
      // Set up domain association using LaunchesService
      const redirectionDomainResult = await this.launchesService.configureDomainInAmplify(
        repoName,
        primaryDomain,
        subDomainSettings
      )

      if (redirectionDomainResult.isErr()) {
        return errAsync(redirectionDomainResult.error)
      }

      const { appId, siteId } = redirectionDomainResult.value

      logger.info(
        `Created Domain association for ${repoName} to ${primaryDomain}`
      )

      // Get DNS records from Amplify
      const isTestEnv = config.get(
        "aws.amplify.mockAmplifyDomainAssociationCalls"
      )
      // since we mock values during development, we don't have to await for the dns records
      if (!isTestEnv) {
        /**
         * note: we wait for ard 90 sec as there is a time taken
         * for amplify to generate the certification manager in the first place
         * This is a dirty workaround for now, and will cause issues when we integrate
         * this directly within the Isomer CMS.
         * todo: push this check into a queue-like system when integrating this with cms
         */
        await new Promise((resolve) => setTimeout(resolve, 90000))
        /**
         * todo: add some level of retry logic if get domain association command
         * does not contain the DNS redirections info.
         */
      }

      const dnsInfo = await this.launchesService.getDomainAssociationRecord(
        primaryDomain,
        appId
      )

      const certificationRecord = this.parseDNSRecords(
        dnsInfo.domainAssociation?.certificateVerificationDNSRecord
      )
      if (certificationRecord.isErr()) {
        return errAsync(
          new AmplifyError(
            `Missing certificate, error while parsing ${JSON.stringify(dnsInfo)}
            ${certificationRecord.error}`,
            repoName,
            appId
          )
        )
      }

      const {
        source: domainValidationSource,
        target: domainValidationTarget,
      } = certificationRecord.value

      const subDomainList = dnsInfo.domainAssociation?.subDomains
      if (!subDomainList || !subDomainList[0].dnsRecord) {
        return errAsync(
          new AmplifyError(
            "Missing subdomain subdomain list not created yet",
            repoName,
            appId
          )
        )
      }

      const primaryDomainInfo = this.parseDNSRecords(subDomainList[0].dnsRecord)

      if (primaryDomainInfo.isErr()) {
        return errAsync(
          new AmplifyError(
            `Missing primary domain info ${primaryDomainInfo.error}`,
            repoName,
            appId
          )
        )
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

      const primaryDomainTarget = primaryDomainInfo.value.target
      const redirectionDomainList = dnsInfo.domainAssociation?.subDomains?.filter(
        (subDomain) => subDomain.subDomainSetting?.prefix
      )

      /**
       * Amplify only stores the prefix.
       * ie: if I wanted to have a www.blah.gov.sg -> gibberish.cloudfront.net,
       * amplify will store the prefix as "www". To get the entire redirectionDomainSource,
       * I would have to add the prefix ("www") with the primary domain (blah.gov.sg)
       */
      const userId = agency.id
      newLaunchParams = {
        userId,
        siteId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
      }

      if (redirectionDomainList?.length) {
        newLaunchParams.redirectionDomainSource = `www.${primaryDomain}` // we only support 'www' redirections for now
        newLaunchParams.redirectionDomainTarget = REDIRECTION_SERVER_IP
      }

      // Create launches records table
      const launchesRecord = await this.launchesService.createOrUpdate(
        newLaunchParams
      )
      logger.info(`Created launch record in database:  ${launchesRecord}`)

      const message: SiteLaunchMessage = {
        repoName,
        appId,
        primaryDomainSource: primaryDomain,
        primaryDomainTarget,
        domainValidationSource,
        domainValidationTarget,
        requestorEmail: requestor.email ? requestor.email : "",
        agencyEmail: agency.email ? agency.email : "", // TODO: remove conditional after making email not optional/nullable
      }

      if (newLaunchParams.redirectionDomainSource) {
        const redirectionDomainObject = {
          source: newLaunchParams.primaryDomainSource,
          target: REDIRECTION_SERVER_IP,
          type: RedirectionTypes.A,
        }
        message.redirectionDomain = [redirectionDomainObject]
      }
      console.log("input to step functions", message)
      if (DEPRECATE_SITE_QUEUES) {
        await this.dynamoDBService.createItem(message)
        await this.stepFunctionsService.triggerFlow(message)
      } else {
        await this.queueService.sendMessage(message)
      }
      return okAsync(newLaunchParams)
    } catch (error) {
      return errAsync(
        new AmplifyError(
          `Failed to create '${repoName}' site on Isomer: ${error}`,
          repoName
        )
      )
    }
  }

  siteUpdate = async () => {
    try {
      const messages = DEPRECATE_SITE_QUEUES
        ? await this.dynamoDBService.getAllCompletedLaunches()
        : await this.queueService.pollMessages()
      await Promise.all(
        messages.map(async (message) => {
          const site = await this.sitesService.getBySiteName(message.repoName)
          if (site.isErr()) {
            return
          }
          const isSuccess = message.status?.state === "success"

          let updateSiteLaunchParams

          if (isSuccess) {
            updateSiteLaunchParams = {
              id: site.value.id,
              siteStatus: SiteStatus.Launched,
              jobStatus: JobStatus.Running,
            }
          } else {
            updateSiteLaunchParams = {
              id: site.value.id,
              siteStatus: SiteStatus.Initialized,
              jobStatus: JobStatus.Failed,
            }
          }

          await this.sitesService.update(updateSiteLaunchParams)

          await this.sendEmailUpdate(message, isSuccess)
        })
      )
    } catch (error) {
      logger.error(`Error in site update: ${error}`)
    }
  }

  pollMessages = async () => {
    setInterval(this.siteUpdate, SITE_LAUNCH_UPDATE_INTERVAL)
  }

  sendEmailUpdate = async (message: SiteLaunchMessage, isSuccess: boolean) => {
    const successEmailDetails = {
      subject: `Launch site ${message.repoName} SUCCESS`,
      body: `<p>Isomer site ${message.repoName} was launched successfully.</p>
          <p>You may now visit your live website. <a href="${message.primaryDomainSource}">${message.primaryDomainSource}</a> should be accessible within a few minutes.</p>
          <p>This email was sent from the Isomer CMS backend.</p>`,
    }

    const failureEmailDetails = {
      subject: `Launch site ${message.repoName} FAILURE`,
      body: `<p>Isomer site ${message.repoName} was not launched successfully.</p>
          <p>Error: ${message.statusMetadata}</p>
          <p>This email was sent from the Isomer CMS backend.</p>
          `,
    }

    let emailDetails: { subject: string; body: string }
    if (isSuccess) {
      emailDetails = successEmailDetails
    } else {
      emailDetails = failureEmailDetails
    }

    await mailer.sendMail(
      message.requestorEmail,
      emailDetails.subject,
      emailDetails.body
    )
  }
}
