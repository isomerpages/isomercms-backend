import {
  DomainAssociation,
  GetDomainAssociationCommandOutput,
  SubDomainSetting,
} from "@aws-sdk/client-amplify"
import { Err, err, Ok, ok } from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launch, Repo, User, Redirection } from "@database/models"
import { RedirectionTypes } from "@root/constants/constants"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

export type SiteLaunchCreateParams = {
  userId: number
  siteId: number
  primaryDomainSource: string
  primaryDomainTarget: string
  domainValidationSource: string
  domainValidationTarget: string
  redirectionDomainSource?: string
  redirectionDomainTarget?: string
}

interface LaunchesServiceProps {
  launchesRepository: ModelStatic<Launch>
  deploymentRepository: ModelStatic<Deployment>
  redirectionsRepository: ModelStatic<Redirection>
  repoRepository: ModelStatic<Repo>
  userRepository: ModelStatic<User>
  launchClient: LaunchClient
}

export interface DomainAssociationMeta {
  domainAssociation: DomainAssociation
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
    this.launchClient = launchClient
    this.launchesRepository = launchesRepository
    this.repoRepository = repoRepository
    this.redirectionsRepository = redirectionsRepository
  }

  createOrUpdate = async (
    createParams: SiteLaunchCreateParams
  ): Promise<Launch> => {
    const [launch, isNewLaunch] = await this.launchesRepository.upsert(
      createParams
    )

    if (!isNewLaunch) {
      // In the case that this is a re-launch,
      // need to delete previous records in redirection table
      const outDatedRedirections = await this.redirectionsRepository.findAll({
        where: { launchId: launch.id },
      })

      await Promise.all(
        outDatedRedirections.map(async (outDatedRedirection) => {
          await this.redirectionsRepository.destroy({
            where: { id: outDatedRedirection.id },
          })
        })
      )
    }

    if (createParams.redirectionDomainSource) {
      logger.info(
        `creating redirection record for ${createParams.redirectionDomainSource}`
      )
      const createRedirectionParams = {
        launchId: launch.id,
        type: RedirectionTypes.A,
        source: createParams.redirectionDomainSource,
        target: createParams.primaryDomainTarget,
      }
      await this.redirectionsRepository.create(createRedirectionParams)
    }

    return launch
  }

  getAppId = async (
    repoName: string
  ): Promise<Err<never, Error> | Ok<string, never>> => {
    const siteId = await this.getSiteId(repoName)
    if (siteId.isErr()) {
      const error = Error(`Failed to find repo '${repoName}' site on Isomer`)
      logger.error(error)
      return err(error)
    }

    const deploy = await this.deploymentRepository.findOne({
      where: { site_id: siteId.value },
    })
    const hostingID = deploy?.hostingId

    if (!hostingID) {
      const error = Error(
        `Failed to find hosting ID for deployment '${deploy}' on Isomer`
      )
      logger.error(error)
      return err(error)
    }
    return ok(hostingID)
  }

  getSiteId = async (
    repoName: string
  ): Promise<Err<never, Error> | Ok<number, never>> => {
    const site = await this.repoRepository.findOne({
      where: { name: repoName },
    })
    const siteId = site?.siteId

    if (!siteId) {
      const error = Error(`Failed to find site id for '${repoName}' on Isomer`)
      logger.error(error)
      return err(error)
    }
    return ok(siteId)
  }

  configureDomainInAmplify = async (
    repoName: string,
    domainName: string,
    subDomainSettings: SubDomainSetting[]
  ): Promise<Err<never, AmplifyError> | Ok<DomainAssociationMeta, never>> => {
    // Get appId, which is stored as hostingID in database table.
    const appIdResult = await this.getAppId(repoName)
    if (appIdResult.isErr()) {
      throw appIdResult.error
    }
    const siteIdResult = await this.getSiteId(repoName)
    if (siteIdResult.isErr()) {
      throw siteIdResult.error
    }

    const launchAppOptions = this.launchClient.createDomainAssociationCommandInput(
      appIdResult.value,
      domainName,
      subDomainSettings
    )

    // Create Domain Association
    const domainAssociationResult = await this.launchClient.sendCreateDomainAssociation(
      launchAppOptions
    )

    if (!domainAssociationResult.domainAssociation) {
      return err(
        new AmplifyError(
          `Call to CreateApp on Amplify returned malformed output for ${repoName}`,
          repoName,
          appIdResult.value
        )
      )
    }

    logger.info(`Successfully created domain association for ${repoName}`)
    const redirectionDomainObject: DomainAssociationMeta = {
      repoName,
      domainAssociation: domainAssociationResult.domainAssociation,
      appId: appIdResult.value,
      siteId: siteIdResult.value,
    }
    return ok(redirectionDomainObject)
  }

  getDomainAssociationRecord = async (
    domainName: string,
    appId: string
  ): Promise<GetDomainAssociationCommandOutput> => {
    const getDomainAssociationOptions = this.launchClient.createGetDomainAssociationCommandInput(
      appId,
      domainName
    )
    return this.launchClient.sendGetDomainAssociationCommand(
      getDomainAssociationOptions
    )
  }

  async updateRedirectionTable(
    updateParams: Partial<Redirection> & Pick<Redirection, "id">
  ) {
    return this.redirectionsRepository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }
}

export default LaunchesService