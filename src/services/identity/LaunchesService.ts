import { SubDomainSettings } from "aws-sdk/clients/amplify"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Launches, Repo } from "@database/models"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

type launchesCreateParamsType = Partial<Launches> & {
  productionUrl: Deployment["productionUrl"]
  stagingUrl: Deployment["stagingUrl"]
  site: Deployment["site"]
  siteId: Deployment["siteId"]
}
interface LaunchesServiceProps {
  launches: ModelStatic<Launches>
  deployment: ModelStatic<Deployment>
  repo: ModelStatic<Repo>
  appId: string
}

export class LaunchesService {
  private readonly deployment: LaunchesServiceProps["deployment"]

  private readonly launches: LaunchesServiceProps["launches"]

  private readonly repo: LaunchesServiceProps["repo"]

  private readonly launchClient: LaunchClient

  constructor({ deployment, launches, repo }: LaunchesServiceProps) {
    this.deployment = deployment
    this.launchClient = new LaunchClient()
    this.launches = launches
    this.repo = repo
  }

  create = async (createParams: launchesCreateParamsType): Promise<Launches> =>
    this.launches.create(createParams)

  getAppId = async (repoName: string) => {
    const site = await this.repo.findOne({
      where: { name: repoName },
    })
    const siteId = site?.siteId

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
}

export default LaunchesService
