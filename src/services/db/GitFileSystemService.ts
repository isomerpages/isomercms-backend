import fs from "fs"

import { errAsync, okAsync, ResultAsync } from "neverthrow"
import { SimpleGit } from "simple-git"

import { config } from "@config/config"

import GitFileSystemError from "@errors/GitFileSystemError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import type { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"

/**
 * Some notes:
 * - Seems like getTree, updateTree and updateRepoState is always used together
 */

const EFS_VOL_PATH = config.get("aws.efs.volPath")
const BRANCH_REF = config.get("github.branchRef")

export default class GitFileSystemService {
  private readonly git: SimpleGit

  constructor(git: SimpleGit) {
    this.git = git
  }

  private async isGitInitialized(
    repoName: string
  ): Promise<ResultAsync<boolean, GitFileSystemError>> {
    try {
      const isGitRepo = await this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .checkIsRepo()

      return okAsync(isGitRepo)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  private async isOriginRemoteCorrect(
    repoName: string
  ): Promise<ResultAsync<boolean, GitFileSystemError>> {
    try {
      const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`
      const remoteUrl = await this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .remote(["get-url", "origin"])

      return okAsync(!remoteUrl || remoteUrl.trim() !== originUrl)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // Determine if the folder is a valid Git repository
  async isValidGitRepo(
    repoName: string
  ): Promise<ResultAsync<boolean, GitFileSystemError>> {
    try {
      const isFolderExisting = fs.existsSync(`${EFS_VOL_PATH}/${repoName}`)
      if (!isFolderExisting) {
        return okAsync(false)
      }

      const isGitInitialized = await this.isGitInitialized(repoName)
      if (isGitInitialized.isErr() || !isGitInitialized.value) {
        return okAsync(false)
      }

      const isOriginRemoteCorrect = await this.isOriginRemoteCorrect(repoName)
      return okAsync(
        isOriginRemoteCorrect.isOk() && isOriginRemoteCorrect.value
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // Obtain the Git blob hash of a file or directory
  async getGitBlobHash(
    repoName: string,
    filePath: string
  ): Promise<ResultAsync<string, GitFileSystemError>> {
    try {
      const hash = await this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .checkout(BRANCH_REF)
        .revparse([`HEAD:${filePath}`])
      return okAsync(hash)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // Clone repository from upstream Git hosting provider
  async clone(
    repoName: string
  ): Promise<ResultAsync<string, GitFileSystemError>> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    try {
      if (fs.existsSync(`${EFS_VOL_PATH}/${repoName}`)) {
        const isGitInitialized = await this.isGitInitialized(repoName)
        if (isGitInitialized.isErr() || !isGitInitialized.value) {
          return errAsync(
            new GitFileSystemError(
              `An existing folder "${repoName}" exists but is not a Git repo`
            )
          )
        }

        const isOriginRemoteCorrect = await this.isOriginRemoteCorrect(repoName)
        if (isOriginRemoteCorrect.isErr() || !isOriginRemoteCorrect.value) {
          return errAsync(
            new GitFileSystemError(
              `An existing folder "${repoName}" exists but is not the correct Git repo`
            )
          )
        }

        return okAsync(`${EFS_VOL_PATH}/${repoName}`)
      }

      await this.git
        .clone(originUrl, `${EFS_VOL_PATH}/${repoName}`)
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .checkout(BRANCH_REF)
      return okAsync(`${EFS_VOL_PATH}/${repoName}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // Pull the latest changes from upstream Git hosting provider
  // TODO: Pulling is a very expensive operation, should find a way to optimise
  async pull(
    repoName: string
  ): Promise<ResultAsync<string, GitFileSystemError>> {
    const isValid = await this.isValidGitRepo(repoName)

    if (isValid.isOk() && !isValid.value) {
      return errAsync(
        new GitFileSystemError(`Folder "${repoName}" is not a valid Git repo`)
      )
    }
    if (isValid.isErr()) {
      return errAsync(isValid.error)
    }

    try {
      await this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).pull()
      return okAsync(`${EFS_VOL_PATH}/${repoName}`).checkout(BRANCH_REF)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // TODO: Creates either directory or file
  // ResourceDirectoryService used this to create a directory + file at the same time
  async create() {}

  // Read the contents of a file
  async read(
    repoName: string,
    filePath: string
  ): Promise<ResultAsync<GitFile, GitFileSystemError>> {
    // Ensure that the repository is up-to-date first
    const isUpdated = await this.pull(repoName)

    if (isUpdated.isErr()) {
      return errAsync(isUpdated.error)
    }

    // Read the file and get the hash concurrently
    try {
      const [contents, sha] = await Promise.all([
        fs.promises.readFile(
          `${EFS_VOL_PATH}/${repoName}/${filePath}`,
          "utf-8"
        ),
        this.getGitBlobHash(repoName, filePath),
      ])

      if (sha.isErr()) {
        return errAsync(sha.error)
      }

      const result: GitFile = {
        contents,
        sha: sha.value,
      }

      return okAsync(result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // Read the contents of a directory
  async listDirectoryContents(
    repoName: string,
    directoryPath: string
  ): Promise<ResultAsync<GitDirectoryItem[], GitFileSystemError>> {
    // Check that the directory path provided exists and is a directory
    try {
      const stats = await fs.promises.stat(
        `${EFS_VOL_PATH}/${repoName}/${directoryPath}`
      )

      if (!stats.isDirectory()) {
        return errAsync(
          new GitFileSystemError(
            `Path "${directoryPath}" is not a directory in repo "${repoName}"`
          )
        )
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }

    // Read the directory contents
    try {
      const directoryContents = await fs.promises.readdir(
        `${EFS_VOL_PATH}/${repoName}/${directoryPath}`,
        { withFileTypes: true }
      )

      const result: GitDirectoryItem[] = await Promise.all(
        directoryContents.map(async (directoryItem) => {
          const isDirectory = directoryItem.isDirectory()
          const { name } = directoryItem
          const path = directoryPath === "" ? name : `${directoryPath}/${name}`
          const type = isDirectory ? "dir" : "file"
          const fileHash = await this.getGitBlobHash(repoName, path)
          const sha = fileHash.isOk() ? fileHash.value : ""

          return {
            name,
            type,
            sha,
            path,
          }
        })
      )

      // Note: The sha is empty if the file is not tracked by Git
      const gitTrackedResults = result.filter(
        (directoryItem) => directoryItem.sha !== ""
      )

      return okAsync(gitTrackedResults)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return errAsync(new GitFileSystemError(message))
    }
  }

  // TODO: Update the contents of a file
  async update() {}

  // TODO: Delete a file
  async delete() {}

  // TODO: Get the latest commit of branch
  async getLatestCommitOfBranch() {}
}
