import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment } from "@database/models"
import { AmplifyError } from "@root/types/index"
import LaunchClient from "@services/identity/LaunchClient"

type launchesCreateParamsType = Partial<Deployment> & {
  productionUrl: Deployment["productionUrl"]
  stagingUrl: Deployment["stagingUrl"]
  site: Deployment["site"]
  siteId: Deployment["siteId"]
}
interface LaunchesServiceProps {
  repository: ModelStatic<Deployment>
}

export class LaunchesService {
  private readonly repository: LaunchesServiceProps["repository"]

  private readonly launchClient: LaunchClient

  constructor({ repository }: LaunchesServiceProps) {
    this.repository = repository
    this.launchClient = new LaunchClient()
  }

  create = async (
    createParams: launchesCreateParamsType
  ): Promise<Deployment> => this.repository.create(createParams) // todo change to launches table

  configureDomainInAmplify = async (repoName: string, domainName: string) => {
    const launchAppOptions = this.launchClient.createDomainAssociationCommandInput(
      repoName,
      domainName,
      undefined
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
