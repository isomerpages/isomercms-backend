import {
  AmplifyClient,
  CreateAppCommand,
  CreateAppCommandInput,
  CreateAppCommandOutput,
  CreateBranchCommand,
  CreateBranchCommandInput,
  CreateBranchCommandOutput,
  Stage,
} from "@aws-sdk/client-amplify"
import { errAsync, ResultAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import logger from "@logger/logger"

import { Deployment, Site } from "@database/models"

const { SYSTEM_GITHUB_TOKEN, AWS_REGION } = process.env

const AMPLIFY_BUILD_SPEC = `
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - bundle install
    build:
      commands:
        - curl https://raw.githubusercontent.com/opengovsg/isomer-build/amplify/build.sh | bash
  artifacts:
    baseDirectory: _site
    files:
      - '**/*'
  cache:
    paths: []
`
export interface AmplifyInfo {
  name: string
  arn: string
  id: string
  defaultDomain: string
  repository: string
}

export class AmplifyError extends Error {
  appName?: string

  appArn?: string

  appId?: string

  public constructor(
    msg: string,
    appName?: string,
    appArn?: string,
    appId?: string
  ) {
    super(msg)
    this.appName = appName
    this.appArn = appArn
    this.appId = appId
  }
}

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

  private readonly deploymentClient: AmplifyClient

  constructor({ repository }: DeploymentsServiceProps) {
    this.repository = repository
    this.deploymentClient = new AmplifyClient({
      region: AWS_REGION,
    })
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
    const options: CreateAppCommandInput = {
      name: repoName,
      accessToken: SYSTEM_GITHUB_TOKEN,
      repository: repoUrl,
      buildSpec: AMPLIFY_BUILD_SPEC,
      environmentVariables: {
        JEKYLL_ENV: "development",
      },
      customRules: [{ source: "/<*>", target: "/404.html", status: "404-200" }],
    }

    logger.info(`PublishToAmplify ${repoUrl}`)

    // 1. Create App
    return (
      ResultAsync.fromPromise(
        this.deploymentClient.send(new CreateAppCommand(options)),
        (e) => {
          logger.error(`AMPLIFY ERROR: ${e}`)
          new AmplifyError(`Publish to Amplify failed: ${e}`)
        }
      )
        .andThen((out: CreateAppCommandOutput) => {
          const { app } = out

          if (!app) {
            return errAsync(
              new Error("Successful CreateApp returned null app result.")
            )
          }
          const { appArn, appId, name, defaultDomain } = app
          logger.info(
            `Successfully published '${name}' (appId: ${appId}, ${appArn})`
          )
          const amplifyInfo: AmplifyInfo = {
            name: name || repoName,
            arn: appArn || "",
            id: appId || "",
            defaultDomain: defaultDomain || `${appId}.amplifyapp.com`,
            repository: repoUrl,
          }

          // 2. Create Master branch
          const options: CreateBranchCommandInput = {
            appId,
            framework: "Jekyll",
            branchName: "master",
            stage: Stage.PRODUCTION,
            enableAutoBuild: true,
            environmentVariables: {
              JEKYLL_ENV: "production",
            },
          }
          return ResultAsync.fromPromise(
            this.deploymentClient.send(new CreateBranchCommand(options)),
            (e) =>
              new AmplifyError(
                `Create Amplify master branch failed: ${e}`,
                name,
                appArn,
                appId
              )
          ).map(
            (_out: CreateBranchCommandOutput) =>
              // Can inspect _out here if necessary.
              amplifyInfo
          )
        })

        // 3. Create Staging branch
        .andThen((amplifyInfo: AmplifyInfo) => {
          const options: CreateBranchCommandInput = {
            appId: amplifyInfo.id,
            framework: "Jekyll",
            branchName: "staging",
            stage: Stage.DEVELOPMENT,
            enableAutoBuild: true,
            environmentVariables: {
              JEKYLL_ENV: "staging",
            },
          }
          return ResultAsync.fromPromise(
            this.deploymentClient.send(new CreateBranchCommand(options)),
            (e) =>
              new AmplifyError(
                `Create Amplify staging branch failed: ${e}`,
                amplifyInfo.name,
                amplifyInfo.arn,
                amplifyInfo.id
              )
          ).map(
            (_out: CreateBranchCommandOutput) =>
              // Can inspect _out here if necessary.
              amplifyInfo
          )
        })
    )
  }
}

export default DeploymentsService
