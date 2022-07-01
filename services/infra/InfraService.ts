import { SiteStatus, JobStatus } from "@constants/index"

import logger from "@root/logger/logger"
import DeploymentsService from "@services/identity/DeploymentsService"
import MailClient from "@services/identity/MailClient"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"

interface InfraServiceProps {
  usersService: UsersService
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
  mailer: MailClient
}

export default class InfraService {
  private readonly usersService: InfraServiceProps["usersService"]

  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  private readonly mailer: InfraServiceProps["mailer"]

  constructor({
    usersService,
    sitesService,
    reposService,
    deploymentsService,
    mailer,
  }: InfraServiceProps) {
    this.usersService = usersService
    this.sitesService = sitesService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
    this.mailer = mailer
  }

  sendCreateError = async (
    email: string,
    repoName: string | undefined,
    submissionId: string | undefined,
    error: string
  ) => {
    const subject = `[Isomer] Create site ${repoName} FAILURE`
    const html = `<p>Isomer site ${repoName} was <b>not</b> created successfully. (Form submission id [${submissionId}])</p>
<p>${error}</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await this.mailer.sendMail(email, subject, html)
  }

  sendCreateSuccess = async (
    email: string,
    repoName: string,
    submissionId: string | undefined,
    stagingUrl: string,
    productionUrl: string
  ) => {
    const subject = `[Isomer] Create site ${repoName} SUCCESS`
    const html = `<p>Isomer site ${repoName} was created successfully. (Form submission id [${submissionId}])</p>
<p>You may now view this repository on GitHub. <a href="${stagingUrl}">Staging</a> and <a href="${productionUrl}">production</a> deployments should be accessible within a few minutes.</p>
<p>This email was sent from the Isomer CMS backend.</p>`
    await this.mailer.sendMail(email, subject, html)
  }

  createSite = async ({
    requesterEmail,
    siteName,
    repoName,
    submissionId,
  }: {
    requesterEmail: string
    siteName: string | undefined
    repoName: string | undefined
    submissionId: string | undefined
  }) => {
    let siteId: number | undefined
    try {
      logger.info(
        `Create site form submission [${submissionId}] (${repoName}, '${siteName}') requested by ${requesterEmail}`
      )

      // Verify that required fields are defined
      if (!siteName) {
        const err = `A site name is required`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return
      }
      if (!repoName) {
        const err = `A repository name is required`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return
      }

      // 1. Find user in the Users table with the specified email
      const foundUser = await this.usersService.findByEmail(requesterEmail)
      if (!foundUser) {
        const err = `Form submitter ${requesterEmail} is not an Isomer user. Register an account for this user and try again.`
        await this.sendCreateError(requesterEmail, repoName, submissionId, err)
        return
      }

      // 2. If the user exists, create a new site record in the Sites table
      //    with the associated user (creator) record
      const newSiteParams = {
        name: siteName,
        apiTokenName: "", // TODO: figure this out
        creator: foundUser,
        creatorId: foundUser.id,
      }
      const newSite = await this.sitesService.create(newSiteParams)
      logger.info(`Created site record in database, site ID: ${newSite.id}`)
      siteId = newSite.id // For error handling

      // 3. Set up GitHub repo and branches using the ReposService
      await this.reposService.setupGithubRepo({ repoName, site: newSite })
      logger.info(`Created repo in GitHub, repo name: ${repoName}`)

      // 4. Set up the Amplify project using the DeploymentsService
      const deployment = await this.deploymentsService.setupAmplifyProject({
        repoName,
        site: newSite,
      })
      logger.info(`Created deployment in AWS Amplify, repo name: ${repoName}`)

      // 5. Set Amplify deployment URLs in repo
      await this.reposService.modifyDeploymentUrlsOnRepo(
        repoName,
        deployment.productionUrl,
        deployment.stagingUrl
      )

      // 6. Set up permissions
      await this.reposService.setRepoAndTeamPermissions(repoName)

      // 7. Update status
      const updateSuccessSiteInitParams = {
        id: newSite.id,
        siteStatus: SiteStatus.Initialized,
        jobStatus: JobStatus.Ready,
      }
      await this.sitesService.update(updateSuccessSiteInitParams)
      logger.info(`Successfully created site on Isomer, site ID: ${newSite.id}`)

      await this.sendCreateSuccess(
        requesterEmail,
        repoName,
        submissionId,
        deployment.stagingUrl,
        deployment.productionUrl
      )
    } catch (err) {
      if (siteId !== undefined) {
        const updateFailSiteInitParams = {
          id: siteId,
          jobStatus: JobStatus.Failed,
        }
        await this.sitesService.update(updateFailSiteInitParams)
      }
      logger.info(`Failed to created '${repoName}' site on Isomer`)
      await this.sendCreateError(
        requesterEmail,
        repoName,
        submissionId,
        `Error: ${err}`
      )
      logger.error(err)
    }
  }
}
