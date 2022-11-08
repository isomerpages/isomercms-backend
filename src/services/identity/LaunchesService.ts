import { DomainAssociation, SubDomainSetting } from "@aws-sdk/client-amplify"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launches, Repo, User } from "@database/models"
import { Redirections } from "@root/database/models/Redirections"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

type siteLaunchCreateParamsType = {
  userId: number
  siteId: number
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
}

type launchesCreateParamsType = Pick<
  Launches,
  | "userId"
  | "siteId"
  | "primaryDomainSource"
  | "primaryDomainTarget"
  | "domainValidationSource"
  | "domainValidationTarget"
>

type redirectionsCreateParamsType = Pick<
  Redirections,
  "launchId" | "type" | "source" | "target"
>

interface LaunchesServiceProps {
  launchesRepository: ModelStatic<Launches>
  deploymentRepository: ModelStatic<Deployment>
  redirectionsRepository: ModelStatic<Redirections>
  repoRepository: ModelStatic<Repo>
  userRepository: ModelStatic<User>
  launchClient: LaunchClient
}

export interface DomainAssocationInterface {
  domainAssociationResult: DomainAssociation
  appId: string
  repoName: string
  siteId: number
}
export class LaunchesService {
  private readonly deploymentRepository: LaunchesServiceProps["deploymentRepository"]

  private readonly launchesRepository: LaunchesServiceProps["launchesRepository"]

  private readonly repoRepository: LaunchesServiceProps["repoRepository"]

  private readonly redirectionsRepository: LaunchesServiceProps["redirectionsRepository"]

  private readonly launchClient: LaunchesServiceProps["launchClient"]

  constructor({
    deploymentRepository,
    launchesRepository,
    repoRepository,
    redirectionsRepository,
    launchClient,
  }: LaunchesServiceProps) {
    this.deploymentRepository = deploymentRepository
    this.launchClient = launchClient ?? new LaunchClient()
    this.launchesRepository = launchesRepository
    this.repoRepository = repoRepository
    this.redirectionsRepository = redirectionsRepository
  }

  create = async (
    createParams: siteLaunchCreateParamsType
  ): Promise<Launches> => {
    const launchParams: launchesCreateParamsType = { ...createParams }
    const createLaunch = await this.launchesRepository.create(launchParams)
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
      await this.redirectionsRepository.create(createRedirectionParams)
    }

    return createLaunch
  }

  createRedirection = async (
    createParams: redirectionsCreateParamsType
  ): Promise<Redirections> => this.redirectionsRepository.create(createParams)

  getAppId = async (repoName: string) => {
    const siteId = await this.getSiteId(repoName)
    if (!siteId) {
      const error = Error(`Failed to find repo '${repoName}' site on Isomer`)
      logger.error(error)
      throw error
    }

    const deploy = await this.deploymentRepository.findOne({
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
    const site = await this.repoRepository.findOne({
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
    subDomainSettings: SubDomainSetting[]
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
    return this.launchClient.sendGetDomainAssociationCommand(
      getDomainAssociationOptions
    )
  }

  async updateLaunchTable(updateParams: Pick<Launches, "id">) {
    return this.launchesRepository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }

  async updateRedirectionTable(updateParams: Pick<Redirections, "id">) {
    return this.redirectionsRepository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }
}

export default LaunchesService
