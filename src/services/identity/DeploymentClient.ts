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
} from "@aws-sdk/client-amplify"
import { ResultAsync } from "neverthrow"

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
    wrap(this.amplifyClient.send(new CreateAppCommand(options)))

  sendCreateBranch = (options: CreateBranchCommandInput) =>
    wrap(this.amplifyClient.send(new CreateBranchCommand(options)))

  sendUpdateApp = (options: UpdateBranchCommandInput) =>
    wrap(this.amplifyClient.send(new UpdateBranchCommand(options)))

  generateCreateAppInput = (
    repoName: string,
    repoUrl: string
  ): CreateAppCommandInput => ({
    name: repoName,
    accessToken: SYSTEM_GITHUB_TOKEN,
    repository: repoUrl,
    buildSpec: AMPLIFY_BUILD_SPEC,
    environmentVariables: {
      JEKYLL_ENV: "development",
    },
    customRules: [{ source: "/<*>", target: "/404.html", status: "404" }],
  })

  generateCreateBranchInput = (
    appId: string,
    branchName: "master" | "staging"
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

  generateUpdatePasswordInput = (
    appId: string,
    password: string
  ): UpdateBranchCommandInput => {
    if (password) {
      return {
        appId,
        branchName: "staging",
        enableBasicAuth: true,
        basicAuthCredentials: Buffer.from(`user:${password}`).toString(
          "base64"
        ),
      }
    }
    return {
      appId,
      branchName: "staging",
      enableBasicAuth: false,
      basicAuthCredentials: "",
    }
  }
}

export default DeploymentClient
