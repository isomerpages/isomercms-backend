import path from "path"

import { ResultAsync, errAsync, fromPromise, okAsync } from "neverthrow"

import { lock, unlock } from "@utils/mutex-utils"

import { EFS_VOL_PATH_STAGING_LITE } from "@root/constants"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import LockedError from "@root/errors/LockedError"
import ReposService from "@root/services/identity/ReposService"

import GitFileSystemService from "../db/GitFileSystemService"

const LOCK_TIME_SECONDS = 15 * 60 // 15 minutes

const gitFileSystemService: GitFileSystemService = (null as unknown) as GitFileSystemService
const reposService: ReposService = (null as unknown) as ReposService

export const lockRepo = (repoName: string) =>
  ResultAsync.fromPromise(
    lock(repoName, LOCK_TIME_SECONDS),
    (err) => new LockedError(`Unable to lock repo ${repoName}, ${err}`)
  ).map(() => repoName)

export const unlockRepo = (repoName: string) => {}

export const cloneRepo = (repoName: string, lockRepo = true) => {
  if (lockRepo) {
    lock(repoName)
  }

  const repoUrl = `git@github.com:isomerpages/${repoName}.git`

  gitFileSystemService
    // Repo does not exist in EFS, clone it
    .cloneBranch(repoName, true)
    .andThen(() =>
      // repo exists in efs, but we need to pull for staging and reset staging lite
      gitFileSystemService
        .pull(repoName, "staging")
        .andThen(() =>
          fromPromise(
            reposService.setUpStagingLite(
              path.join(EFS_VOL_PATH_STAGING_LITE, repoName),
              repoUrl
            ),
            (error) =>
              new GitFileSystemError(
                `Error setting up staging lite for repo ${repoName}: ${error}`
              )
          )
        )
    )
    // TODO: update this to actually send a message to slack
    .andThen(() => sendSlackMessage(repoName))
}
