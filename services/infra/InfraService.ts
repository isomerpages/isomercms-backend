import { SiteStatus, JobStatus } from "@constants/index"

import logger from "@root/logger/logger"
import DeploymentsService from "@services/identity/DeploymentsService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"

interface InfraServiceProps {
  usersService: UsersService
  sitesService: SitesService
  reposService: ReposService
  deploymentsService: DeploymentsService
}

export default class InfraService {
  private readonly usersService: InfraServiceProps["usersService"]

  private readonly sitesService: InfraServiceProps["sitesService"]

  private readonly reposService: InfraServiceProps["reposService"]

  private readonly deploymentsService: InfraServiceProps["deploymentsService"]

  constructor({
    usersService,
    sitesService,
    reposService,
    deploymentsService,
  }: InfraServiceProps) {
    this.usersService = usersService
    this.sitesService = sitesService
    this.reposService = reposService
    this.deploymentsService = deploymentsService
  }

  createSite = async ({
    email,
    repoName,
  }: {
    email: string
    repoName: string
  }) => {
    try {
      // 1. Find user in the Users table with the specified email
      const foundUser = await this.usersService.findByEmail(email)
      if (!foundUser) {
        // TODO: Handle error by sending email to user who requested to create site
        return
      }

      // 2. If the user exists, create a new site record in the Sites table
      //    with the associated user (creator) record
      const newSiteParams = {
        name: repoName,
        apiTokenName: "", // TODO: figure this out
        creator: foundUser,
        creatorId: foundUser.id,
      }
      const newSite = await this.sitesService.create(newSiteParams)
      logger.info(`Created site record in database, site ID: ${newSite.id}`)

      // 3. Set up GitHub repo and branches using the ReposService
      await this.reposService.setupGithubRepo({ repoName, site: newSite })
      logger.info(`Created repo in GitHub, repo name: ${repoName}`)

      // 4. Set up the Amplify project using the DeploymentsService
      await this.deploymentsService.setupAmplifyProject({
        repoName,
        site: newSite,
      })
      logger.info(`Created deployment in AWS Amplify, repo name: ${repoName}`)

      const updateSuccessSiteInitParams = {
        id: newSite.id,
        siteStatus: SiteStatus.Launch,
        jobStatus: JobStatus.Ready,
      }
      await this.sitesService.update(updateSuccessSiteInitParams)
      logger.info(`Successfully created site on Isomer, site ID: ${newSite.id}`)

      // TODO: Handle success by sending email to user who requested to create site
    } catch (err) {
      // TODO: Handle error by sending email to user who requested to create site
      logger.error(err)
    }
  }
}
