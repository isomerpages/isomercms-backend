import { JobStatus } from "@aws-sdk/client-amplify"
import { Result, ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import { config } from "@config/config"

import logger from "@logger/logger"

import { Deployment, Repo, Site } from "@database/models"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
import { NotFoundError } from "@root/errors/NotFoundError"
import { AmplifyError, AmplifyInfo } from "@root/types/index"
import { BuildStatus, StatusStates } from "@root/types/stagingBuildStatus"
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
  deploymentsRepository: ModelStatic<Deployment>
}

class DeploymentsService {
  private readonly deploymentsRepository: DeploymentsServiceProps["deploymentsRepository"]

  private readonly deploymentClient: DeploymentClient

  constructor({ deploymentsRepository }: DeploymentsServiceProps) {
    this.deploymentsRepository = deploymentsRepository
    this.deploymentClient = new DeploymentClient()
  }

  create = async (
    createParams: deploymentsCreateParamsType
  ): Promise<Deployment> => this.deploymentsRepository.create(createParams)

  setupAmplifyProject = async ({
    repoName,
    site,
  }: {
    repoName: string
    site: Site
  }): Promise<Deployment> => {
    const [
      amplifyStagingResult,
      amplifyStagingLiteResult,
    ] = await this.createAmplifyAppsOnAws(repoName)
    if (amplifyStagingResult.isErr()) {
      logger.error(
        `Amplify set up error for main app: ${amplifyStagingResult.error}`
      )
      throw amplifyStagingResult.error
    }

    if (amplifyStagingLiteResult.isErr()) {
      logger.error(
        `Amplify set up error for staging-lite app: ${amplifyStagingLiteResult.error}`
      )
      throw amplifyStagingLiteResult.error
    }

    const amplifyInfoStaging = amplifyStagingResult.value
    const amplifyInfoStagingLite = amplifyStagingLiteResult.value

    return this.create({
      stagingUrl: Brand.fromString(
        `https://staging-lite.${amplifyStagingLiteResult.value.defaultDomain}`
      ),
      productionUrl: Brand.fromString(
        `https://master.${amplifyStagingResult.value.defaultDomain}`
      ),
      site,
      siteId: site.id,
      hostingId: amplifyInfoStaging.id,
      stagingLiteHostingId: amplifyInfoStagingLite.id,
    })
  }

  createAmplifyAppsOnAws = async (repoName: string) => {
    const stagingApp = await this.createAmplifyAppOnAws(
      repoName,
      repoName,
      false
    )
    const stagingLiteApp = await this.createAmplifyAppOnAws(
      repoName,
      `${repoName}-staging-lite`,
      true
    )
    return [stagingApp, stagingLiteApp]
  }

  createAmplifyAppOnAws = async (
    repoName: string,
    appName: string,
    isStagingLite: boolean
  ): Promise<Result<AmplifyInfo, AmplifyError>> => {
    const repoUrl = `https://github.com/isomerpages/${repoName}`
    logger.info(`PublishToAmplify ${repoUrl}`)

    const createAppOptions = this.deploymentClient.generateCreateAppInput({
      appName,
      repoUrl,
      repoName,
      isStagingLite,
    })
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

        // 2. Create branch command inputs
        const createMasterBranchInput = this.deploymentClient.generateCreateBranchInput(
          amplifyInfo.id,
          "master"
        )

        const createStagingBranchInput = this.deploymentClient.generateCreateBranchInput(
          amplifyInfo.id,
          "staging"
        )

        const createStagingLiteBranchInput = this.deploymentClient.generateCreateBranchInput(
          amplifyInfo.id,
          "staging-lite"
        )

        // 3. Create branches
        if (isStagingLite) {
          return this.deploymentClient
            .sendCreateBranch(createStagingLiteBranchInput)
            .andThen(() =>
              this.deploymentClient.sendStartJobCommand({
                appId: amplifyInfo.id,
                branchName: "staging-lite",
                jobType: "RELEASE",
              })
            )
            .map(() => amplifyInfo)
        }
        return this.deploymentClient
          .sendCreateBranch(createMasterBranchInput)
          .andThen(() =>
            this.deploymentClient.sendStartJobCommand({
              appId: amplifyInfo.id,
              branchName: "master",
              jobType: "RELEASE",
            })
          )
          .map(() => amplifyInfo)
          .andThen(() =>
            this.deploymentClient
              .sendCreateBranch(createStagingBranchInput)
              .andThen(() =>
                this.deploymentClient.sendStartJobCommand({
                  appId: amplifyInfo.id,
                  branchName: "staging",
                  jobType: "RELEASE",
                })
              )
              .map(() => amplifyInfo)
          )
      })
  }

  getDeploymentInfoFromSiteId = async (siteId: string) => {
    const deploymentInfo = await this.deploymentsRepository.findOne({
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
    await this.deploymentsRepository.update(
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
    const SECRET_KEY = config.get("aws.amplify.passwordSecretKey")
    const deploymentInfo = await this.deploymentsRepository.findOne({
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
      return errAsync(
        new NotFoundError(`Deployment for site ${repoName} does not exist`)
      )
    const { id, hostingId: appId } = deploymentInfo

    if (!enablePassword) return this.deletePassword(appId, id)

    const {
      encryptedPassword: oldEncryptedPassword,
      encryptionIv: oldIv,
    } = deploymentInfo
    if (
      !!oldEncryptedPassword &&
      decryptPassword(oldEncryptedPassword, oldIv, SECRET_KEY) ===
        oldEncryptedPassword
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

    const { encryptedPassword, iv } = encryptPassword(password, SECRET_KEY)
    await this.deploymentsRepository.update(
      {
        encryptedPassword,
        encryptionIv: iv,
        passwordDate: new Date(),
      },
      { where: { id } }
    )

    return updateResp
  }

  updateStagingUrl = async (siteId: number, stagingUrl: string) => {
    const deploymentInfo = await this.deploymentsRepository.findOne({
      where: {
        siteId,
      },
    })
    if (!deploymentInfo)
      return errAsync(new NotFoundError("Site has not been deployed!"))
    logger.info(`Updating staging url for ${siteId} to ${stagingUrl}`)
    await this.deploymentsRepository.update(
      {
        stagingUrl,
      },
      { where: { siteId } }
    )
    return okAsync(deploymentInfo)
  }

  getStagingSiteBuildStatus = (
    siteId: string,
    isRepoWhiteListedForBuildRed: boolean
  ): ResultAsync<BuildStatus, NotFoundError | AmplifyError> =>
    fromPromise(
      this.deploymentsRepository.findOne({
        where: {
          siteId,
        },
      }),
      () => new NotFoundError("Site has not been deployed!")
    )
      .andThen((deploymentInfo) => {
        if (!deploymentInfo) {
          return errAsync(new NotFoundError("Site has not been deployed!"))
        }
        return okAsync(deploymentInfo)
      })
      .andThen((deploymentInfo) => {
        let userStagingApp: string
        const { hostingId, stagingLiteHostingId } = deploymentInfo
        if (isRepoWhiteListedForBuildRed) {
          userStagingApp = stagingLiteHostingId
        } else {
          userStagingApp = hostingId
        }

        if (!userStagingApp) {
          return errAsync(
            new NotFoundError("Staging site has not been deployed!")
          )
        }
        return okAsync(userStagingApp)
      })
      .andThen((userStagingApp) => {
        const branchName = isRepoWhiteListedForBuildRed
          ? STAGING_LITE_BRANCH
          : STAGING_BRANCH
        return this.deploymentClient.getJobSummaries(userStagingApp, branchName)
      })
      .andThen((jobSummaries) => {
        if (jobSummaries.length === 0) {
          return okAsync(StatusStates.pending)
        }

        const jobSummary = jobSummaries[0]

        switch (jobSummary.status) {
          case JobStatus.SUCCEED:
            return okAsync(StatusStates.ready)
          case JobStatus.FAILED:
            return okAsync(StatusStates.error)
          default:
            return okAsync(StatusStates.pending)
        }
      })
}

export default DeploymentsService
