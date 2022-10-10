import { DomainAssociation } from "@aws-sdk/client-amplify"
import { SubDomainSettings } from "aws-sdk/clients/amplify"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launches, Repo, Site, User } from "@database/models"
import { Redirections } from "@root/database/models/Redirections"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

type launchesCreateParamsType = Partial<Launches> & {
  userId: number
  siteId: number
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
}

type redirectionsCreateParamsType = Partial<Redirections> & {
  launchId: number
  type: string
  source: string
  target: string
}
interface LaunchesServiceProps {
  launches: ModelStatic<Launches>
  deployment: ModelStatic<Deployment>
  redirections: ModelStatic<Redirections>
  repo: ModelStatic<Repo>
  user: ModelStatic<User>
}

export interface DomainAssocationInterface {
  domainAssociationResult: DomainAssociation
  appId: string
  repoName: string
  siteId: number
}
export class LaunchesService {
  private readonly deployment: LaunchesServiceProps["deployment"]

  private readonly launches: LaunchesServiceProps["launches"]

  private readonly repo: LaunchesServiceProps["repo"]

  private readonly redirections: LaunchesServiceProps["redirections"]

  private readonly launchClient: LaunchClient

  constructor({
    deployment,
    launches,
    repo,
    redirections,
  }: LaunchesServiceProps) {
    this.deployment = deployment
    this.launchClient = new LaunchClient()
    this.launches = launches
    this.repo = repo
    this.redirections = redirections
  }

  create = async (
    createParams: launchesCreateParamsType
  ): Promise<Launches> => {
    const createLaunch = await this.launches.create(createParams)
    if (createParams.redirectionDomainSource) {
      logger.info(
        `creating redirection record for ${createParams.redirectionDomainSource}`
      )
      const createRedirectionParams: redirectionsCreateParamsType = {
        launchId: createLaunch.id,
        type: "CNAME",
        source: createParams.redirectionDomainSource,
        target: createParams.primaryDomainTarget,
      }
      await this.redirections.create(createRedirectionParams)
    }

    return createLaunch
  }

  createRedirection = async (
    createParams: redirectionsCreateParamsType
  ): Promise<Redirections> => this.redirections.create(createParams)

  getAppId = async (repoName: string) => {
    const siteId = await this.getSiteId(repoName)
    if (!siteId) {
      const error = Error(`Failed to find repo '${repoName}' site on Isomer`)
      logger.error(error)
      throw error
    }

    const deploy = await this.deployment.findOne({
      where: { site_id: siteId },
    })
    const hostingID = deploy?.hostingId

    if (!hostingID) {
      const error = Error(
        `Failed to find hosting ID for deployment '${deploy}' on Isomer`
      )
      logger.error(error)
      throw error
    }
    return hostingID
  }

  getSiteId = async (repoName: string) => {
    const site = await this.repo.findOne({
      where: { name: repoName },
    })
    const siteId = site?.siteId

    if (!siteId) {
      const error = Error(`Failed to find site id for '${repoName}' on Isomer`)
      logger.error(error)
      throw error
    }
    return siteId
  }

  configureDomainInAmplify = async (
    repoName: string,
    domainName: string,
    subDomainSettings: SubDomainSettings
  ) => {
    // Get appId, which is stored as hostingID in database table.
    const appId = await this.getAppId(repoName)
    const siteId = await this.getSiteId(repoName)

    const launchAppOptions = this.launchClient.createDomainAssociationCommandInput(
      appId,
      domainName,
      subDomainSettings
    )

    // Create Domain Association
    const domainAssociationResult = await this.launchClient
      .sendCreateDomainAssociation(launchAppOptions)
      .then((out) => {
        const { domainAssociation } = out
        if (!domainAssociation) {
          throw new AmplifyError(
            "Call to CreateApp on Amplify returned malformed output."
          )
        }
        logger.info(`Successfully published '${domainAssociation}'`)
        return domainAssociation
      })
    const redirectionDomainObject: DomainAssocationInterface = {
      repoName,
      domainAssociationResult,
      appId,
      siteId,
    }
    return redirectionDomainObject
  }

  getDomainAssociationRecord = async (domainName: string, appId: string) => {
    const getDomainAssociationOptions = this.launchClient.createGetDomainAssociationCommandInput(
      appId,
      domainName
    )

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
    return this.launchClient.sendGetDomainAssociationCommandInput(
      getDomainAssociationOptions
    )
  }

  async updateLaunchTable(
    updateParams: Partial<Launches> & { id: Site["id"] }
  ) {
    return this.launches.update(updateParams, {
      where: { id: updateParams.id },
    })
  }

  async updateRedirectionTable(
    updateParams: Partial<Redirections> & { id: Launches["id"] }
  ) {
    return this.redirections.update(updateParams, {
      where: { id: updateParams.id },
    })
  }
}

export default LaunchesService
