import { errAsync, okAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import {} from "crypto"
import logger from "@logger/logger"

import { Deployment, Repo, Site } from "@database/models"
import { NotFoundError } from "@root/errors/NotFoundError"
import { AmplifyError, AmplifyInfo } from "@root/types/index"
import { Brand } from "@root/types/util"
import { decryptPassword, encryptPassword } from "@root/utils/crypto-utils"
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
  ): Promise<Deployment> => this.repository.create(createParams)

  setupAmplifyProject = async ({
    repoName,
    site,
  }: {
    repoName: string
    site: Site
  }): Promise<Deployment> => {
    const amplifyResult = await this.createAmplifyAppOnAws(repoName)
    if (amplifyResult.isErr()) {
      logger.error(`Amplify set up error: ${amplifyResult.error}`)
      throw amplifyResult.error
    }
    const amplifyInfo = amplifyResult.value

    return this.create({
      stagingUrl: Brand.fromString(
        `https://staging.${amplifyInfo.defaultDomain}`
      ),
      productionUrl: Brand.fromString(
        `https://master.${amplifyInfo.defaultDomain}`
      ),
      site,
      siteId: site.id,
      hostingId: amplifyInfo.id,
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

  getDeploymentInfoFromSiteId = async (siteId: string) => {
    const deploymentInfo = await this.repository.findOne({
      where: {
        siteId,
      },
    })
    if (!deploymentInfo)
      return errAsync(new NotFoundError("Site has not been deployed!"))
    return okAsync(deploymentInfo)
  }

  deletePassword = async (appId: string, deploymentId: number) => {
    const updateAppInput = this.deploymentClient.generateDeletePasswordInput(
      appId
    )
    const updateResp = await this.deploymentClient.sendUpdateApp(updateAppInput)

    if (updateResp.isErr()) {
      return updateResp
    }
    await this.repository.update(
      {
        encryptedPassword: null,
        encryptionIv: null,
        passwordDate: null,
      },
      { where: { id: deploymentId } }
    )
    return updateResp
  }

  updateAmplifyPassword = async (
    repoName: string,
    password: string,
    enablePassword: boolean
  ) => {
    const deploymentInfo = await this.repository.findOne({
      include: [
        {
          model: Site,
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: repoName,
              },
            },
          ],
        },
      ],
    })
    if (!deploymentInfo)
      return errAsync(`Deployment for ${repoName} does not exist`)
    const { id, hostingId: appId } = deploymentInfo

    if (!enablePassword) return this.deletePassword(appId, id)

    const {
      encryptedPassword: oldEncryptedPassword,
      encryptionIv: oldIv,
    } = deploymentInfo
    if (
      !!oldEncryptedPassword &&
      decryptPassword(oldEncryptedPassword, oldIv) === oldEncryptedPassword
    )
      return okAsync("")
    const updateAppInput = this.deploymentClient.generateUpdatePasswordInput(
      appId,
      password
    )

    const updateResp = await this.deploymentClient.sendUpdateApp(updateAppInput)
    if (updateResp.isErr()) {
      return updateResp
    }

    const { encryptedPassword, iv } = encryptPassword(password)
    await this.repository.update(
      {
        encryptedPassword,
        encryptionIv: iv,
        passwordDate: new Date(),
      },
      { where: { id } }
    )

    return updateResp
  }
}

export default DeploymentsService
