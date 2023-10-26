/* eslint-disable import/prefer-default-export */ // todo remove this line post dev
import path from "path"

import {
  DecryptedContentAndAttachments,
  DecryptedFile,
} from "@opengovsg/formsg-sdk/dist/types"
import express, { RequestHandler } from "express"
import {
  ResultAsync,
  combineWithAllErrors,
  errAsync,
  fromPromise,
  okAsync,
} from "neverthrow"

import { config } from "@config/config"

import { EFS_VOL_PATH_STAGING_LITE } from "@root/constants"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import InitializationError from "@root/errors/InitializationError"
import { consoleLogger } from "@root/logger/console.logger"
import logger from "@root/logger/logger"
import { attachFormSGHandler } from "@root/middleware"
import GitFileSystemService from "@root/services/db/GitFileSystemService"
import ReposService from "@root/services/identity/ReposService"
import { mailer } from "@root/services/utilServices/MailClient"
import { getField, getFieldsFromTable, getId } from "@root/utils/formsg-utils"

const GGS_REPAIR_FORM_KEY = config.get("formSg.ggsRepairFormKey")

interface FormsgGGsRepairRouterProps {
  gitFileSystemService: GitFileSystemService
  reposService: ReposService
}

interface RepairEmailProps {
  clonedRepos: string[]
  syncedRepos: string[]
  errors: GitFileSystemError[]
  requesterEmail: string
}

const REQUESTER_EMAIL_FIELD = "Email"
const OPTION_TO_SUBMIT_CSV = "Do you want to upload list of sites as a CSV?"
const ATTACHMENT = "Attachment"
const REPO_NAME_FIELD = "Table (Repo Name (in GitHub))"

export class FormsgGGsRepairRouter {
  private readonly gitFileSystemService: FormsgGGsRepairRouterProps["gitFileSystemService"]

  private readonly reposService: FormsgGGsRepairRouterProps["reposService"]

  constructor({
    gitFileSystemService,
    reposService,
  }: FormsgGGsRepairRouterProps) {
    this.gitFileSystemService = gitFileSystemService
    this.reposService = reposService
  }

  getGGsRepairFormSubmission: RequestHandler<
    never,
    Record<string, never>,
    { data: { submissionId: string } },
    never,
    { submission: DecryptedContentAndAttachments }
  > = async (req, res) => {
    console.log(res)
    console.log(res.locals)
    console.log(res.locals.submission)

    const { responses } = res.locals.submission.content

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    const optionToSubmitCsv = getField(responses, OPTION_TO_SUBMIT_CSV)
    const repoNames: string[] = []
    if (optionToSubmitCsv === "Yes") {
      const attachmentId = getId(responses, ATTACHMENT)
      if (!attachmentId) {
        throw new Error("No attachment id")
      }
      const decryptedFile: DecryptedFile =
        res.locals.submission.attachments?.[attachmentId]
      const reposCsv = Buffer.from(decryptedFile.content).toString()
      if (!reposCsv.startsWith("repo_name")) {
        logger.error("Invalid csv format")
        return
      }
      const repos = reposCsv.split("\n").slice(1)
      console.log(repos)
      repos.forEach((repo) => {
        repoNames.push(repo)
      })
      if (repoNames.length === 0) {
        logger.error("No repo name provided")
        return
      }
    } else {
      const repoNamesFromTable = getFieldsFromTable(responses, REPO_NAME_FIELD)

      if (!repoNamesFromTable) {
        logger.error("No repo name provided")
        return
      }
      repoNamesFromTable.forEach((repoName) => {
        if (typeof repoName === "string") {
          // actually wont happen based on our formsg form, but this code
          // is added defensively
          repoNames.push(repoName)
        } else {
          repoNames.push(repoName[0])
        }
      })
    }

    //! TODO: Kishore: remember to reenable verification of the formsg submission post-dev
    if (!requesterEmail?.endsWith("@open.gov.sg")) {
      logger.error("Requester email is not from @open.gov.sg")
      return
    }
    this.handleGGsFormSubmission(repoNames, requesterEmail)
  }

  // 3 test cases
  // 1 -> repos that dont exist in efs
  // 2 -> repos that exist in efs but need a re-sync
  // 3 -> 1 + 2 combined
  handleGGsFormSubmission = (repoNames: string[], requesterEmail: string) => {
    const repairs: ResultAsync<string, GitFileSystemError>[] = []

    const clonedStagingRepos: string[] = []
    const syncedStagingAndStagingLiteRepos: string[] = []
    repoNames.forEach((repoName) => {
      const repoUrl = `https://github.com/isomerpages/${repoName}`

      repairs.push(
        this.doesRepoNeedClone(repoName)
          .andThen(() => {
            const isStaging = true
            return (
              this.gitFileSystemService
                // Repo does not exist in EFS, clone it
                .cloneBranch(repoName, isStaging)
                .andThen(() => {
                  // take note of repos that cloned successfully
                  clonedStagingRepos.push(repoName)
                  return okAsync(true)
                })
            )
          })
          .orElse((error) => {
            if (error === false) {
              // Repo exists in EFS, no need to clone, but continue with syncing
              return okAsync(false)
            }
            return errAsync<boolean, GitFileSystemError>(error)
          })
          .andThen(() => {
            console.log("pulling", repoName)

            // repo exists in efs, but we need to pull for staging and reset staging lite
            return this.gitFileSystemService
              .pull(repoName, "staging")
              .andThen(() => {
                console.log("resetting staging lite", repoName)
                const setUpStgLiteRes: ResultAsync<
                  string,
                  GitFileSystemError
                > = fromPromise(
                  this.reposService.setUpStagingLite(
                    path.join(EFS_VOL_PATH_STAGING_LITE, repoName),
                    repoUrl
                  ),
                  (error) =>
                    new GitFileSystemError(
                      `Error setting up staging lite for repo ${repoName}: ${error}`
                    )
                )
                return setUpStgLiteRes
              })
              .andThen((result) => {
                console.log("syncing", repoName)
                // take note of repos that synced successfully
                syncedStagingAndStagingLiteRepos.push(repoName)
                return okAsync(result)
              })
          })
      )
    })

    let errors: GitFileSystemError[] = []
    combineWithAllErrors(repairs)
      .orElse((error) => {
        errors = error
        // send one final email about success and failures
        return okAsync([])
      })
      .andThen(() => {
        console.log(
          "syncedStagingAndStagingLiteRepos",
          syncedStagingAndStagingLiteRepos
        )
        console.log("clonedStagingRepos", clonedStagingRepos)
        return fromPromise(
          this.sendEmail({
            requesterEmail,
            clonedRepos: clonedStagingRepos,
            syncedRepos: syncedStagingAndStagingLiteRepos,
            errors,
          }),
          (error) => {
            const emailContent = `Sites have been repaired ${
              errors ? `with errors ${errors}` : `without errors`
            } and clonedRepos ${clonedStagingRepos} and syncedRepos ${syncedStagingAndStagingLiteRepos}`
            // Logging information in case email sending fails
            consoleLogger.error(
              `There was an error sending email to ${requesterEmail}: ${error}\n The content of the email is: ${emailContent}`
            )
          }
        )
      })
  }

  async sendEmail({
    requesterEmail,
    clonedRepos,
    syncedRepos,
    errors,
  }: RepairEmailProps) {
    const subject = `[Isomer] Site Repair Report`
    const errorReport =
      errors.length > 0
        ? `The following errors were observed while repairing the sites:
<ul>
${errors.map((error) => `<li>${error.message}</li>`)}
</ul>`
        : ""

    const clonedReposReport =
      clonedRepos.length > 0
        ? `The following sites were cloned to EFS:
<ul>
${clonedRepos.map((repo) => `<li>${repo}</li>`)}
</ul>`
        : ""

    const syncedReposReport =
      syncedRepos.length > 0
        ? `The following sites were synced to EFS:
<ul>
${syncedRepos.map((repo) => `<li>${repo}</li>`)}
</ul>`
        : ""

    const html = errorReport + clonedReposReport + syncedReposReport
    await mailer.sendMail(requesterEmail, subject, html)
  }

  doesRepoNeedClone(repoName: string): ResultAsync<true, false> {
    return this.gitFileSystemService
      .isGitInitialized(repoName)
      .andThen((isRepoInEfs) => {
        if (isRepoInEfs) {
          return errAsync<true, false>(false)
        }
        return okAsync<true, false>(true)
      })
      .orElse(() => okAsync<true, false>(true))
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    if (!GGS_REPAIR_FORM_KEY) {
      throw new InitializationError(
        "Required GGS_REPAIR_FORM_KEY environment variable is empty."
      )
    }
    router.post(
      "/repair-ggs",
      attachFormSGHandler(GGS_REPAIR_FORM_KEY),
      this.getGGsRepairFormSubmission
    )

    return router
  }
}
