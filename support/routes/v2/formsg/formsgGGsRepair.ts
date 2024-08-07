/* eslint-disable import/prefer-default-export */
import path from "path"

import {
  DecryptedContentAndAttachments,
  DecryptedFile,
} from "@opengovsg/formsg-sdk/dist/types"
import express, { RequestHandler } from "express"
import { ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow"

import { config } from "@config/config"

import { lock, unlock } from "@utils/mutex-utils"

import { EFS_VOL_PATH_STAGING_LITE } from "@root/constants"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import InitializationError from "@root/errors/InitializationError"
import LockedError from "@root/errors/LockedError"
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
  lockedRepos: string[]
  clonedRepos: string[]
  syncedRepos: string[]
  errors: GitFileSystemError[]
  requesterEmail: string
}

const REQUESTER_EMAIL_FIELD = "Email"
const OPTION_TO_SUBMIT_CSV = "Do you want to upload list of sites as a CSV?"
const ATTACHMENT = "Attachment"
const REPO_NAME_FIELD = "Table (Repo Name (in GitHub))"
const REPAIR_MODE_FIELD = "Repair mode"

type RepairModeType = "only_lock" | "repair_without_lock" | "repair_with_lock"
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
    const { responses } = res.locals.submission.content

    const requesterEmail = getField(responses, REQUESTER_EMAIL_FIELD)
    const optionToSubmitCsv = getField(responses, OPTION_TO_SUBMIT_CSV)
    const repairModeResponse = getField(responses, REPAIR_MODE_FIELD)

    let repairMode: RepairModeType = "repair_with_lock"

    if (repairModeResponse === "Repair without acquiring lock") {
      repairMode = "repair_without_lock"
    } else if (repairModeResponse === "Only lock repo") {
      repairMode = "only_lock"
    }

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

    if (!requesterEmail?.endsWith("@open.gov.sg")) {
      logger.error("Requester email is not from @open.gov.sg")
      return
    }
    res.sendStatus(200) // we have received the form and obtained relevant field
    this.handleGGsFormSubmission(repoNames, requesterEmail, repairMode)
  }

  handleGGsFormSubmission = (
    repoNames: string[],
    requesterEmail: string,
    repairMode: RepairModeType
  ) => {
    const repairs: ResultAsync<
      string | void,
      GitFileSystemError | LockedError
    >[] = []

    const clonedStagingRepos: string[] = []
    const syncedStagingAndStagingLiteRepos: string[] = []
    const LOCK_TIME_SECONDS = 15 * 60 // 15 minutes
    repoNames.forEach((repoName) => {
      const repoUrl = `git@github.com:isomerpages/${repoName}.git`

      const lockRepo: ResultAsync<"locked", LockedError> =
        repairMode === "repair_without_lock"
          ? okAsync("locked")
          : ResultAsync.fromPromise(
              lock(repoName, LOCK_TIME_SECONDS),
              (err) =>
                new LockedError(`Unable to lock repo ${repoName}, ${err}`)
            ).map(() => "locked")

      if (repairMode === "only_lock") {
        repairs.push(lockRepo)
        return
      }

      repairs.push(
        lockRepo
          .andThen(() => this.doesRepoNeedClone(repoName))
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
            return errAsync(error)
          })
          .andThen(() =>
            // repo exists in efs, but we need to pull for staging and reset staging lite
            this.gitFileSystemService
              .pull(repoName, "staging")
              .andThen(() =>
                fromPromise(
                  this.reposService.setUpStagingLite(
                    path.join(EFS_VOL_PATH_STAGING_LITE, repoName),
                    repoUrl
                  ),
                  (error) =>
                    new GitFileSystemError(
                      `Error setting up staging lite for repo ${repoName}: ${error}`
                    )
                )
              )
              .andThen((result) => {
                // take note of repos that synced successfully
                syncedStagingAndStagingLiteRepos.push(repoName)
                return okAsync(result)
              })
          )
          .andThen((result) => {
            // Failure to unlock is not blocking
            ResultAsync.fromPromise(unlock(repoName), () => {
              logger.error(
                "Failed to unlock repo - repo will unlock after at most 15 min"
              )
            })
            return okAsync(result)
          })
      )
    })

    let errors: GitFileSystemError[] = []
    ResultAsync.combineWithAllErrors(repairs)
      .orElse((error) => {
        errors = error
        // send one final email about success and failures
        return okAsync([])
      })
      .andThen(() =>
        fromPromise(
          this.sendEmail({
            requesterEmail,
            lockedRepos: repairMode === "only_lock" ? repoNames : [],
            clonedRepos: clonedStagingRepos,
            syncedRepos: syncedStagingAndStagingLiteRepos,
            errors,
          }),
          (error) => {
            const emailContent = `Sites have been repaired ${
              errors ? `with errors ${errors}` : `without errors`
            } and clonedRepos ${clonedStagingRepos} and syncedRepos ${syncedStagingAndStagingLiteRepos} and lockedRepos ${repoNames} for requester ${requesterEmail} with repair mode ${repairMode}`
            // Logging information in case email sending fails
            logger.error(
              `There was an error sending email to ${requesterEmail}: ${error}\n The content of the email is: ${emailContent}`
            )
          }
        )
      )
  }

  async sendEmail({
    requesterEmail,
    lockedRepos,
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

    const lockedReposReport =
      lockedRepos.length > 0
        ? `The following sites were locked:
<ul>
${lockedRepos.map((repo) => `<li>${repo}</li>`)}
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

    const html =
      errorReport + clonedReposReport + syncedReposReport + lockedReposReport
    await mailer.sendMail(requesterEmail, subject, html)
  }

  doesRepoNeedClone(repoName: string): ResultAsync<true, false> {
    return this.gitFileSystemService
      .isGitInitialized(repoName, true)
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
