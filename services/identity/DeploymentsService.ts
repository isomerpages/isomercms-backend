import { errAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Site } from "@database/models"
import { AmplifyError, AmplifyInfo } from "@root/types/index"
import DeploymentClient from "@services/identity/DeploymentClient"

type deploymentsCreateParamsType = Partial<Deployment> & {
  productionUrl: Deployment["productionUrl"]
  stagingUrl: Deployment["stagingUrl"]
  site: Deployment["site"]
  siteId: Deployment["siteId"]
}
interface DeploymentsServiceProps {
  repository: ModelStatic<Deployment>
}

class DeploymentsService {
  private readonly repository: DeploymentsServiceProps["repository"]

  private readonly deploymentClient: DeploymentClient

  constructor({ repository }: DeploymentsServiceProps) {
    this.repository = repository
    this.deploymentClient = new DeploymentClient()
  }

  create = async (
    createParams: deploymentsCreateParamsType
  ): Promise<Deployment | null> => this.repository.create(createParams)

  setupAmplifyProject = async ({
    repoName,
    site,
  }: {
    repoName: string
    site: Site
  }) => {
    const amplifyResult = await this.createAmplifyAppOnAws(repoName)
    const amplifyDomain = amplifyResult.map((result) => result.defaultDomain)

    if (amplifyDomain.isErr()) {
      return logger.error(`Amplify set up error: ${amplifyResult}`)
    }
    return this.create({
      stagingUrl: `https://staging.${amplifyDomain.value}`,
      productionUrl: `https://master.${amplifyDomain.value}`,
      site,
      siteId: site.id,
    })
  }

  createAmplifyAppOnAws = async (repoName: string) => {
    const repoUrl = `https://github.com/isomerpages/${repoName}`
    logger.info(`PublishToAmplify ${repoUrl}`)

    const createAppOptions = this.deploymentClient.generateCreateAppInput(
      repoName,
      repoUrl
    )
    // 1. Create Amplify app
    return this.deploymentClient
      .sendCreateApp(createAppOptions)
      .andThen((out) => {
        const { app } = out
        if (
          !app ||
          !app.appArn ||
          !app.appId ||
          !app.name ||
          !app.defaultDomain
        ) {
          return errAsync(
            new AmplifyError(
              "Call to CreateApp on Amplify returned malformed output."
            )
          )
        }
        const { appArn: arn, appId: id, name, defaultDomain } = app
        logger.info(`Successfully published '${name}' (appId: ${id}, ${arn})`)
        const amplifyInfo: AmplifyInfo = {
          name,
          arn,
          id,
          defaultDomain,
          repository: repoUrl,
        }

        // 2. Create Master branch
        const createMasterBranchInput = this.deploymentClient.generateCreateBranchInput(
          amplifyInfo.id,
          "master"
        )
        return this.deploymentClient
          .sendCreateBranch(createMasterBranchInput)
          .map(() => amplifyInfo)
      })
      .andThen((amplifyInfo) => {
        // 3. Create Staging branch
        const createStagingBranchInput = this.deploymentClient.generateCreateBranchInput(
          amplifyInfo.id,
          "staging"
        )
        return this.deploymentClient
          .sendCreateBranch(createStagingBranchInput)
          .map(() => amplifyInfo)
      })
  }
}

export default DeploymentsService
