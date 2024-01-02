import {
  AmplifyClient,
  CreateAppCommand,
  CreateAppCommandInput,
  CreateAppCommandOutput,
  CreateBranchCommand,
  CreateBranchCommandInput,
  CreateBranchCommandOutput,
  Stage,
  UpdateBranchCommand,
  UpdateBranchCommandOutput,
  UpdateBranchCommandInput,
  ListJobsCommand,
  ListJobsCommandOutput,
  JobSummary,
  StartJobCommand,
  StartJobCommandOutput,
  StartJobCommandInput,
} from "@aws-sdk/client-amplify"
import { ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow"

import { config } from "@config/config"

import { AmplifyError } from "@root/types/index"

const AWS_REGION = config.get("aws.region")
const SYSTEM_GITHUB_TOKEN = config.get("github.systemToken")

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

const wrap = (promise: Promise<unknown>) =>
  ResultAsync.fromPromise(
    promise,
    (e) => new AmplifyError(`Publish to Amplify failed: ${e}`)
  )

class DeploymentClient {
  private readonly amplifyClient: InstanceType<typeof AmplifyClient>

  constructor() {
    this.amplifyClient = new AmplifyClient({
      region: AWS_REGION,
    })
  }

  sendCreateApp = (options: CreateAppCommandInput) =>
    wrap(this.amplifyClient.send(new CreateAppCommand(options))) as ResultAsync<
      CreateAppCommandOutput,
      AmplifyError
    >

  sendCreateBranch = (options: CreateBranchCommandInput) =>
    wrap(
      this.amplifyClient.send(new CreateBranchCommand(options))
    ) as ResultAsync<CreateBranchCommandOutput, AmplifyError>

  sendUpdateApp = (options: UpdateBranchCommandInput) =>
    wrap(
      this.amplifyClient.send(new UpdateBranchCommand(options))
    ) as ResultAsync<UpdateBranchCommandOutput, AmplifyError>

  sendListJobsApp = (appId: string, branchName: string) =>
    wrap(
      this.amplifyClient.send(new ListJobsCommand({ appId, branchName }))
    ) as ResultAsync<ListJobsCommandOutput, AmplifyError>

  sendStartJobCommand = (options: StartJobCommandInput) =>
    wrap(this.amplifyClient.send(new StartJobCommand(options))) as ResultAsync<
      StartJobCommandOutput,
      AmplifyError
    >

  generateCreateAppInput = ({
    appName,
    repoName,
    repoUrl,
    isStagingLite,
  }: {
    appName: string
    repoUrl: string
    repoName: string
    isStagingLite: boolean
  }): CreateAppCommandInput => {
    const stgLiteRedirectRules = [
      {
        source: "/files/<*>",
        target: `https://raw.githubusercontent.com/isomerpages/${repoName}/staging/files/<*>`,
        status: "200",
      },
      {
        source: "/images/<*>",
        target: `https://raw.githubusercontent.com/isomerpages/${repoName}/staging/images/<*>`,
        status: "200",
      },
    ]
    const defaultRedirectRules = [
      { source: "/<*>", target: "/404.html", status: "404-200" },
    ]

    const redirectRules = isStagingLite
      ? [...stgLiteRedirectRules, ...defaultRedirectRules]
      : defaultRedirectRules

    return {
      name: appName,
      accessToken: SYSTEM_GITHUB_TOKEN,
      repository: repoUrl,
      buildSpec: AMPLIFY_BUILD_SPEC,
      environmentVariables: {
        JEKYLL_ENV: "development",
      },
      customRules: redirectRules,
    }
  }

  generateCreateBranchInput = (
    appId: string,
    branchName: "master" | "staging" | "staging-lite"
  ): CreateBranchCommandInput => ({
    appId,
    framework: "Jekyll",
    branchName,
    stage: branchName === "master" ? Stage.PRODUCTION : Stage.DEVELOPMENT,
    enableAutoBuild: true,
    environmentVariables: {
      JEKYLL_ENV: branchName === "master" ? "production" : "staging",
    },
  })

  generateDeletePasswordInput = (appId: string): UpdateBranchCommandInput => ({
    appId,
    branchName: "staging",
    enableBasicAuth: false,
    basicAuthCredentials: "",
  })

  generateUpdatePasswordInput = (
    appId: string,
    password: string
  ): UpdateBranchCommandInput => ({
    appId,
    branchName: "staging",
    enableBasicAuth: true,
    basicAuthCredentials: Buffer.from(`user:${password}`).toString("base64"),
  })

  getJobSummaries = (
    appId: string,
    branchName: string
  ): ResultAsync<JobSummary[], AmplifyError> =>
    fromPromise(
      this.sendListJobsApp(appId, branchName),
      (err) => new AmplifyError(`${err}`)
    ).andThen((resp) => {
      if (resp.isErr()) {
        return errAsync(resp.error)
      }
      if (!resp.value.jobSummaries) {
        return errAsync(new AmplifyError("No job summaries"))
      }
      return okAsync(resp.value.jobSummaries)
    })
}

export default DeploymentClient
