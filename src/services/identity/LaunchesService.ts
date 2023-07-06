import {
  DomainAssociation,
  GetDomainAssociationCommandOutput,
  SubDomainSetting,
} from "@aws-sdk/client-amplify"
import { err, errAsync, fromPromise, ok, Result, ResultAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launch, Repo, Redirection, Site } from "@database/models"
import {
  JobStatus,
  RedirectionTypes,
  SiteStatus,
  REDIRECTION_SERVER_IP,
} from "@root/constants/constants"
import SiteLaunchError from "@root/errors/SiteLaunchError"
import { AmplifyError } from "@root/types/index"
import { DnsResultsForSite } from "@root/types/siteInfo"
import LaunchClient, {
  isAmplifyDomainNotFoundException,
} from "@services/identity/LaunchClient"

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
  siteRepository: ModelStatic<Site>
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

  private readonly siteRepository: LaunchesServiceProps["siteRepository"]

  constructor({
    deploymentRepository,
    launchesRepository,
    repoRepository,
    redirectionsRepository,
    launchClient,
    siteRepository,
  }: LaunchesServiceProps) {
    this.deploymentRepository = deploymentRepository
    this.launchClient = launchClient
    this.launchesRepository = launchesRepository
    this.repoRepository = repoRepository
    this.redirectionsRepository = redirectionsRepository
    this.siteRepository = siteRepository
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
        source: createParams.primaryDomainSource,
        target: createParams.primaryDomainTarget,
      }
      await this.redirectionsRepository.create(createRedirectionParams)
    }

    return launch
  }

  getAppId = async (repoName: string): Promise<Result<string, Error>> => {
    const siteId = await this.getSiteId(repoName)
    if (siteId.isErr()) {
      const error = Error(`Failed to find repo '${repoName}' site on Isomer`)
      logger.error(JSON.stringify(error))
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
      logger.error(JSON.stringify(error))
      return err(error)
    }
    return ok(hostingID)
  }

  getSiteId = async (repoName: string): Promise<Result<number, Error>> => {
    const site = await this.repoRepository.findOne({
      where: { name: repoName },
    })
    const siteId = site?.siteId

    if (!siteId) {
      const error = Error(`Failed to find site id for '${repoName}' on Isomer`)
      logger.error(JSON.stringify(error))
      return err(error)
    }
    return ok(siteId)
  }

  getDNSRecords = async (
    repoName: string
  ): Promise<Result<DnsResultsForSite, AmplifyError | SiteLaunchError>> => {
    const siteId = await this.getSiteId(repoName)
    if (siteId.isErr()) {
      logger.error(`Failed to find repo '${repoName}' site on Isomer`)
      return err(new SiteLaunchError(`Failed to find repo '${repoName}'`))
    }

    const launchRecord = await fromPromise(
      this.launchesRepository.findOne({
        where: { siteId: siteId.value },
      }),
      () => {
        logger.error(`Failed to get launch record for ${repoName}`)
        return new SiteLaunchError(
          `Failed to get launch record for ${repoName}`
        )
      }
    )

    if (!launchRecord.isOk() || !launchRecord.value) {
      logger.error(`Failed to get launch record`)
      return err(new SiteLaunchError("Failed to get launch record"))
    }

    const redirectionRecord = await fromPromise(
      this.redirectionsRepository.findOne({
        where: { launchId: launchRecord.value.id },
      }),
      () => {
        logger.error(`Failed to get redirection record for ${repoName}`)
        return new SiteLaunchError(
          `Failed to get redirection record for ${repoName}`
        )
      }
    )

    const doesRedirectionRecordExist =
      redirectionRecord.isOk() && redirectionRecord.value
    if (!doesRedirectionRecordExist) {
      logger.info(`No redirection record found for ${repoName}`)
    }

    return ok({
      siteUrl: launchRecord.value.primaryDomainSource,
      dnsRecords: [
        {
          // NOTE: In the case where the redirection exists
          // we need to append the `www` to the primary domain
          // before displaying it to the user as the `source`
          source: doesRedirectionRecordExist
            ? `www.${launchRecord.value.primaryDomainSource}`
            : launchRecord.value.primaryDomainSource,
          target: launchRecord.value.primaryDomainTarget,
          type: RedirectionTypes.CNAME,
        },
        {
          source: launchRecord.value.domainValidationSource,
          target: launchRecord.value.domainValidationTarget,
          type: RedirectionTypes.CNAME,
        },
        ...(doesRedirectionRecordExist
          ? [
              {
                source: redirectionRecord.value.source,
                target: REDIRECTION_SERVER_IP,
                type: RedirectionTypes.A,
              },
            ]
          : []),
      ],
    })
  }

  configureDomainInAmplify = async (
    repoName: string,
    domainName: string,
    subDomainSettings: SubDomainSetting[]
  ): Promise<Result<DomainAssociationMeta, AmplifyError>> => {
    // Get appId, which is stored as hostingID in database table.
    const appIdResult = await this.getAppId(repoName)
    if (appIdResult.isErr()) {
      throw appIdResult.error
    }
    const siteIdResult = await this.getSiteId(repoName)
    if (siteIdResult.isErr()) {
      throw siteIdResult.error
    }

    try {
      // Check if association already exists
      const getDomainAssociationCommandInput = this.launchClient.createGetDomainAssociationCommandInput(
        appIdResult.value,
        domainName
      )

      const getDomainAssociationResult = await this.launchClient.sendGetDomainAssociationCommand(
        getDomainAssociationCommandInput
      )
      const hasDomainAssociationFailed =
        getDomainAssociationResult?.domainAssociation?.domainStatus === "FAILED"
      if (hasDomainAssociationFailed) {
        // safe to delete and retry
        const deleteDomainAssociationCommandInput = this.launchClient.createDeleteDomainAssociationCommandInput(
          appIdResult.value,
          domainName
        )
        await this.launchClient.sendDeleteDomainAssociationCommand(
          deleteDomainAssociationCommandInput
        )
      }
    } catch (error: unknown) {
      const isExpectedNotFoundError = isAmplifyDomainNotFoundException(error)
      if (!isExpectedNotFoundError) {
        return err(
          new AmplifyError(
            `Unable to connect to Amplify for: ${repoName}, ${error}`,
            repoName,
            appIdResult.value
          )
        )
      }
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

  updateDbForLaunchStart = (siteName: string) =>
    ResultAsync.fromPromise(
      this.getSiteId(siteName),
      () => new SiteLaunchError(`Failed to get site id for ${siteName}`)
    ).andThen((siteId) => {
      if (siteId.isErr()) {
        return errAsync(
          new SiteLaunchError(`Failed to get site id for ${siteName}`)
        )
      }
      return ResultAsync.fromPromise(
        this.siteRepository.update(
          {
            siteStatus: SiteStatus.Launched,
            jobStatus: JobStatus.Running,
          },
          {
            where: { id: siteId.value },
          }
        ),
        () =>
          new SiteLaunchError(`Failed to update site status for ${siteName}`)
      )
    })
}

export default LaunchesService
