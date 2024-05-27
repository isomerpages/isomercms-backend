import path from "path"

import { fromPromise, ResultAsync } from "neverthrow"

import { lock } from "@utils/mutex-utils"

import { EFS_VOL_PATH_STAGING_LITE } from "@root/constants"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import LockedError from "@root/errors/LockedError"
import ReposService from "@root/services/identity/ReposService"

import GitFileSystemService from "../db/GitFileSystemService"

const LOCK_TIME_SECONDS = 15 * 60 // 15 minutes

// TODO: Add class constructor and update these to be deps
const gitFileSystemService: GitFileSystemService = (null as unknown) as GitFileSystemService
const reposService: ReposService = (null as unknown) as ReposService

export const lockRepo = (
  repoName: string,
  lockDurationSeconds: number = LOCK_TIME_SECONDS
) =>
  ResultAsync.fromPromise(
    lock(repoName, lockDurationSeconds),
    (err) => new LockedError(`Unable to lock repo ${repoName}, ${err}`)
  ).map(() => repoName)

export const cloneRepo = (repoName: string) => {
  const repoUrl = `git@github.com:isomerpages/${repoName}.git`

  return (
    gitFileSystemService
      .cloneBranch(repoName, true)
      // Repo does not exist in EFS, clone it
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
  )
}
