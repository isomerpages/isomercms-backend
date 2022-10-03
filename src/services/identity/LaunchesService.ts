import { SubDomainSettings } from "aws-sdk/clients/amplify"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launches, Repo, User } from "@database/models"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

type launchesCreateParamsType = Partial<Launches> & {
  userId: number
  siteId: number
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
}
interface LaunchesServiceProps {
  launches: ModelStatic<Launches>
  deployment: ModelStatic<Deployment>
  repo: ModelStatic<Repo>
  user: ModelStatic<User>
  appId: string
}

export class LaunchesService {
  private readonly deployment: LaunchesServiceProps["deployment"]

  private readonly launches: LaunchesServiceProps["launches"]

  private readonly repo: LaunchesServiceProps["repo"]

  private readonly launchClient: LaunchClient

  private appID = ""

  private siteId?: number

  constructor({ deployment, launches, repo }: LaunchesServiceProps) {
    this.deployment = deployment
    this.launchClient = new LaunchClient()
    this.launches = launches
    this.repo = repo
  }

  create = async (createParams: launchesCreateParamsType): Promise<Launches> =>
    this.launches.create(createParams)

  getAppId = async (repoName: string) => {
    const id = await this.getSiteId(repoName)
    console.log(`this is id${id}`)
    if (!this.siteId) {
      const error = Error(`Failed to find repo '${repoName}' site on Isomer`)
      logger.error(error)
      throw error
    }

    const deploy = await this.deployment.findOne({
      where: { site_id: this.siteId },
    })
    const hostingID = deploy?.hostingId

    if (!hostingID) {
      const error = Error(
        `Failed to find hosting ID for deployment '${deploy}' on Isomer`
      )
      logger.error(error)
      throw error
    }
    this.appID = hostingID
    return hostingID
  }

  getSiteId = async (repoName: string) => {
    if (this.siteId) {
      return this.siteId
    }

    const site = await this.repo.findOne({
      where: { name: repoName },
    })
    this.siteId = site?.siteId

    if (!this.siteId) {
      const error = Error(`Failed to find site id for '${repoName}' on Isomer`)
      logger.error(error)
      throw error
    }
    return this.siteId
  }

  configureDomainInAmplify = async (
    repoName: string,
    domainName: string,
    subDomainSettings: SubDomainSettings
  ) => {
    // Get appId, which is stored as hostingID in database table.
    const appId = await this.getAppId(repoName)

    const launchAppOptions = this.launchClient.createDomainAssociationCommandInput(
      appId,
      domainName,
      subDomainSettings
    )

    // Create Domain Association
    return this.launchClient
      .sendCreateDomainAssociation(launchAppOptions)
      .then((out) => {
        const { domainAssociation } = out
        if (!domainAssociation) {
          return new AmplifyError(
            "Call to CreateApp on Amplify returned malformed output."
          )
        }
        logger.info(`Successfully published '${domainAssociation}'`)
        return domainAssociation
      })
  }

  getDomainAssociationRecord = async (domainName: string) => {
    const getDomainAssociationOptions = this.launchClient.createGetDomainAssociationCommandInput(
      this.appID,
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
}

export default LaunchesService
