import { SubDomainSettings } from "aws-sdk/clients/amplify"
import axios from "axios"
import Joi from "joi"
import {
  Err,
  err,
  errAsync,
  Ok,
  ok,
  okAsync,
  Result,
  ResultAsync,
} from "neverthrow"

import { config } from "@config/config"

import { Site } from "@database/models"
import { User } from "@database/models/User"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import {
  SiteStatus,
  JobStatus,
  RedirectionTypes,
  REDIRECTION_SERVER_IPS,
  ISOMER_SUPPORT_EMAIL,
  DNS_INDIRECTION_DOMAIN,
} from "@root/constants"
import GitHubApiError from "@root/errors/GitHubApiError"
import MissingSiteError from "@root/errors/MissingSiteError"
import MissingUserEmailError from "@root/errors/MissingUserEmailError"
import SiteLaunchError from "@root/errors/SiteLaunchError"
import logger from "@root/logger/logger"
import { AmplifyError } from "@root/types/amplify"
import {
  DnsResultsForSite,
  SiteLaunchDto,
  SiteLaunchStatus,
  SiteLaunchStatusObject,
} from "@root/types/siteInfo"
import { SiteLaunchMessage } from "@root/types/siteLaunch"
import DeploymentsService from "@services/identity/DeploymentsService"
import {
  SiteLaunchCreateParams,
  LaunchesService,
} from "@services/identity/LaunchesService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import { mailer } from "@services/utilServices/MailClient"

import CollaboratorsService from "../identity/CollaboratorsService"
import UsersService from "../identity/UsersService"

import DynamoDBService from "./DynamoDBService"
import StepFunctionsService from "./StepFunctionsService"

const SITE_LAUNCH_UPDATE_INTERVAL = 30000

interface InfraServiceProps {
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
  launchesService: LaunchesService
  collaboratorsService: CollaboratorsService
  stepFunctionsService: StepFunctionsService
  dynamoDBService: DynamoDBService
  usersService: UsersService
}

interface dnsRecordDto {
  source: string
  target: string
  type: RedirectionTypes
}

interface CreateSiteParams {
  creator: User
  // this is ok, since we don't need this for github login flow
  member: User | undefined
  siteName: string
  repoName: string
  isEmailLogin: boolean
}

interface LaunchSiteFromCMSParams {
  siteName: string
  primaryDomain: string
  useWww: boolean
  email: string
}

export default class InfraService {
  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  private readonly launchesService: InfraServiceProps["launchesService"]

  private readonly collaboratorsService: InfraServiceProps["collaboratorsService"]

  private readonly stepFunctionsService: InfraServiceProps["stepFunctionsService"]

  private readonly dynamoDBService: InfraServiceProps["dynamoDBService"]

  private readonly usersService: InfraServiceProps["usersService"]

  constructor({
    sitesService,
    reposService,
    deploymentsService,
    launchesService,
    collaboratorsService,
    stepFunctionsService,
    dynamoDBService,
    usersService,
  }: InfraServiceProps) {
    this.sitesService = sitesService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
    this.launchesService = launchesService
    this.collaboratorsService = collaboratorsService
    this.stepFunctionsService = stepFunctionsService
    this.dynamoDBService = dynamoDBService
    this.usersService = usersService
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

  convertDotsToDashes = (url: string) => url.replace(/\./g, "-")

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

  launchSiteFromCms({
    siteName,
    primaryDomain,
    useWww,
    email,
  }: LaunchSiteFromCMSParams): ResultAsync<
    SiteLaunchCreateParams,
    AmplifyError | SiteLaunchError | MissingUserEmailError
  > {
    // prepare site launch params
    return ResultAsync.fromPromise(
      this.usersService.findByEmail(email),
      (error) =>
        new MissingUserEmailError(
          `User with email ${email} not found: ${error}`
        )
    ).andThen((requestor) => {
      if (!requestor) {
        return errAsync(
          new MissingUserEmailError(`User with email ${email} not found`)
        )
      }

      // since site launch in CMS is triggered by the users themselves, we
      // treat requestor and agency as the same user
      const user = requestor
      const agency = requestor
      const subDomainSettings = [
        {
          branchName: "master",
          prefix: `${useWww ? "www" : ""}`,
        },
      ]

      /**
       * We update the database first to indicate that the user
       * has started the site launch flow. This prevents users
       * from retrying and abusing the system.
       *
       * The ability to retry after a failed launch is
       * tracked in IS-273
       */
      return this.launchesService.updateDbForLaunchStart(siteName).andThen(() =>
        ResultAsync.fromPromise(
          this.launchSite(
            user,
            agency,
            siteName,
            primaryDomain,
            subDomainSettings
          ),
          (error) => new SiteLaunchError(`Error launching site: ${error}`)
        ).andThen((siteLaunch) => {
          if (siteLaunch.isOk()) {
            return okAsync(siteLaunch.value)
          }
          return errAsync(siteLaunch.error)
        })
      )
    })
  }

  getIndirectionDomain(
    primaryDomain: string,
    primaryDomainTarget: string
  ): ResultAsync<string, GitHubApiError> {
    const indirectionSubdomain = this.convertDotsToDashes(primaryDomain)
    const indirectionDomain = `${indirectionSubdomain}.${DNS_INDIRECTION_DOMAIN}`

    return this.reposService
      .createDnsIndirectionFile(
        indirectionSubdomain,
        primaryDomain,
        primaryDomainTarget
      )
      .map(() => indirectionDomain)
  }

  getGeneratedDnsRecords = async (
    siteName: string
  ): Promise<
    Result<DnsResultsForSite, MissingSiteError | AmplifyError | SiteLaunchError>
  > => {
    const site = await this.sitesService.getBySiteName(siteName)
    if (site.isErr()) {
      return err(site.error)
    }
    const dnsRecords = await this.launchesService.getDNSRecords(siteName)
    if (dnsRecords.isErr()) {
      return err(dnsRecords.error)
    }
    return ok(dnsRecords.value)
  }

  async getSiteLaunchStatus(
    sessionData: UserWithSiteSessionData
  ): Promise<
    Result<SiteLaunchDto, MissingSiteError | SiteLaunchError | AmplifyError>
  > {
    const { siteName } = sessionData
    const site = await this.sitesService.getBySiteName(siteName)
    if (site.isErr() && !site.isOk()) {
      return errAsync(site.error)
    }
    if (site.value.siteStatus !== SiteStatus.Launched) {
      return okAsync<SiteLaunchDto>({
        siteLaunchStatus: SiteLaunchStatusObject.NotLaunched,
      })
    }

    const generatedDnsRecords = await this.getGeneratedDnsRecords(siteName)
    if (generatedDnsRecords.isErr()) {
      return errAsync(generatedDnsRecords.error)
    }

    let siteLaunchStatus: SiteLaunchStatus
    switch (site.value.jobStatus) {
      case JobStatus.Ready:
        siteLaunchStatus = SiteLaunchStatusObject.Launched
        break
      case JobStatus.Failed:
        siteLaunchStatus = SiteLaunchStatusObject.Failure
        break
      default:
        siteLaunchStatus = SiteLaunchStatusObject.Launching
        break
    }

    return okAsync<SiteLaunchDto>({
      siteLaunchStatus,
      dnsRecords: generatedDnsRecords.value.dnsRecords,
      siteUrl: generatedDnsRecords.value.siteUrl,
    })
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

      // Indirection domain should look something like this:
      // blah-gov-sg.hostedon.isomer.gov.sg
      const indirectionDomain = await this.getIndirectionDomain(
        primaryDomain,
        primaryDomainTarget
      )

      if (indirectionDomain.isErr()) {
        return errAsync(
          new AmplifyError(
            `Error creating indirection domain: ${indirectionDomain.error}`,
            repoName,
            appId
          )
        )
      }

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
        indirectionDomain: indirectionDomain.value,
      }

      if (redirectionDomainList?.length) {
        newLaunchParams.redirectionDomainSource = `www.${primaryDomain}` // we only support 'www' redirections for now
        // any IP is ok
        const [redirectionServerIp] = REDIRECTION_SERVER_IPS
        newLaunchParams.redirectionDomainTarget = redirectionServerIp
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
        indirectionDomain: indirectionDomain.value,
        requestorEmail: requestor.email ? requestor.email : "",
        agencyEmail: agency.email ? agency.email : "", // TODO: remove conditional after making email not optional/nullable
      }

      if (newLaunchParams.redirectionDomainSource) {
        const redirectionDomainObject = REDIRECTION_SERVER_IPS.map((ip) => ({
          source: newLaunchParams.redirectionDomainSource as string, // checked above
          target: ip,
          type: RedirectionTypes.A,
        }))
        message.redirectionDomain = redirectionDomainObject
      }

      await this.dynamoDBService.createItem(message)
      await this.stepFunctionsService.triggerFlow(message)
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
      const messages = await this.dynamoDBService.getAllCompletedLaunches()

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
              jobStatus: JobStatus.Ready,
            }

            // Create better uptime monitor iff site launch is a success
            await this.createMonitor(message.primaryDomainSource)
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

  private async createMonitor(baseDomain: string) {
    const uptimeRobotBaseUrl = "https://api.uptimerobot.com/v2"
    try {
      const UPTIME_ROBOT_API_KEY = config.get("uptimeRobot.apiKey")
      const getResp = await axios.post<{ monitors: { id: string }[] }>(
        `${uptimeRobotBaseUrl}/getMonitors?format=json`,
        {
          api_key: UPTIME_ROBOT_API_KEY,
          search: baseDomain,
        }
      )
      const affectedMonitorIds = getResp.data.monitors.map(
        (monitor) => monitor.id
      )
      const getAlertContactsResp = await axios.post<{
        alert_contacts: { id: string }[]
      }>(`${uptimeRobotBaseUrl}/getAlertContacts?format=json`, {
        api_key: UPTIME_ROBOT_API_KEY,
      })
      const alertContacts = getAlertContactsResp.data.alert_contacts
        .map(
          (contact) => `${contact.id}_0_0` // numbers at the end represent threshold + recurrence, always 0 for free plan
        )
        .join("-")
      if (affectedMonitorIds.length === 0) {
        // Create new monitor
        await axios.post<{ monitors: { id: string }[] }>(
          `${uptimeRobotBaseUrl}/newMonitor?format=json`,
          {
            api_key: UPTIME_ROBOT_API_KEY,
            friendly_name: baseDomain,
            url: `https://${baseDomain}`,
            type: 1, // HTTP(S)
            interval: 30,
            timeout: 30,
            alert_contacts: alertContacts,
            http_method: 2, // GET
          }
        )
      } else {
        // Edit existing monitor
        // We only edit the first matching monitor, in the case where multiple monitors exist
        await axios.post<{ monitors: { id: string }[] }>(
          `${uptimeRobotBaseUrl}/editMonitor?format=json`,
          {
            api_key: UPTIME_ROBOT_API_KEY,
            id: affectedMonitorIds[0],
            friendly_name: baseDomain,
            url: `https://${baseDomain}`,
            type: 1, // HTTP(S)
            interval: 30,
            timeout: 30,
            alert_contacts: alertContacts,
            http_method: 2, // GET
          }
        )
      }
    } catch (uptimerobotErr) {
      // Non-blocking error, since site launch is still successful
      const errMessage = `Unable to create better uptime monitor for ${baseDomain}. Error: ${uptimerobotErr}`
      logger.error(errMessage)
      try {
        await this.sendMonitorCreationFailure(baseDomain)
      } catch (monitorFailureEmailErr) {
        logger.error(
          `Failed to send error email for ${baseDomain}: ${monitorFailureEmailErr}`
        )
      }
    }
  }

  sendMonitorCreationFailure = async (baseDomain: string): Promise<void> => {
    const email = ISOMER_SUPPORT_EMAIL
    const subject = `[Isomer] Monitor creation FAILURE`
    const html = `The Uptime Robot monitor for the following site was not created successfully: ${baseDomain}`
    await mailer.sendMail(email, subject, html)
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

    const targetEmail = isSuccess
      ? message.requestorEmail
      : ISOMER_SUPPORT_EMAIL

    await mailer.sendMail(targetEmail, emailDetails.subject, emailDetails.body)
  }
}
