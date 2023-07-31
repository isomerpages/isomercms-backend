import fs from "fs"

import { errAsync, okAsync, Result } from "neverthrow"
import { GitError, SimpleGit } from "simple-git"

import { config } from "@config/config"

import GitFileSystemError from "@errors/GitFileSystemError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import type { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"

/**
 * Some notes:
 * - Seems like getTree, updateTree and updateRepoState is always used together
 */

const EFS_VOL_PATH = config.get("aws.efs.volPath")

export default class GitFileSystemService {
  private readonly git: SimpleGit

  constructor(git: SimpleGit) {
    this.git = git
  }

  // Determine if the folder is a valid Git repository
  async isValidGitRepo(
    repoName: string
  ): Promise<Result<boolean, GitFileSystemError | unknown>> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    try {
      // Check if an existing folder exists
      if (!fs.existsSync(`${EFS_VOL_PATH}/${repoName}`)) {
        return okAsync(false)
      }

      // Check if the folder is a Git repo
      await this.git.cwd(`${EFS_VOL_PATH}/${repoName}`)
      const isGitRepo = await this.git.checkIsRepo()

      if (!isGitRepo) {
        return okAsync(false)
      }

      // Check if the Git repo is the correct one
      const remoteUrl = await this.git.remote(["get-url", "origin"])
      if (!remoteUrl || remoteUrl.trim() !== originUrl) {
        return okAsync(false)
      }

      return okAsync(true)
    } catch (error: unknown) {
      if (error instanceof GitError) {
        return errAsync(new GitFileSystemError(error.message))
      }
      return errAsync(error)
    }
  }

  // Obtain the Git blob hash of a file or directory
  async getGitBlobHash(
    repoName: string,
    filePath: string
  ): Promise<Result<string, GitFileSystemError | unknown>> {
    try {
      const hash = await this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .revparse([`HEAD:${filePath}`])
      return okAsync(hash)
    } catch (error: unknown) {
      if (error instanceof GitError) {
        return errAsync(new GitFileSystemError(error.message))
      }
      return errAsync(error)
    }
  }

  // Clone repository from upstream Git hosting provider
  async clone(
    repoName: string
  ): Promise<Result<null, GitFileSystemError | unknown>> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    try {
      // Check if an existing folder exists
      if (fs.existsSync(`${EFS_VOL_PATH}/${repoName}`)) {
        // Check if the folder is a Git repo
        await this.git.cwd(`${EFS_VOL_PATH}/${repoName}`)
        const isGitRepo = await this.git.checkIsRepo()

        if (!isGitRepo) {
          return errAsync(
            new GitFileSystemError(
              `An existing folder "${repoName}" exists but is not a Git repo`
            )
          )
        }

        // Check if the Git repo is the correct one
        const remoteUrl = await this.git.remote(["get-url", "origin"])
        if (!remoteUrl || remoteUrl.trim() !== originUrl) {
          return errAsync(
            new GitFileSystemError(
              `An existing folder "${repoName}" exists but is not the correct Git repo`
            )
          )
        }

        return okAsync(null)
      }

      await this.git
        .clone(originUrl, `${EFS_VOL_PATH}/${repoName}`)
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
    } catch (error: unknown) {
      if (error instanceof GitError) {
        return errAsync(new GitFileSystemError(error.message))
      }

      return errAsync(error)
    }

    return okAsync(null)
  }

  // Pull the latest changes from upstream Git hosting provider
  // TODO: Pulling is a very expensive operation, should find a way to optimise
  async pull(
    repoName: string
  ): Promise<Result<null, GitFileSystemError | unknown>> {
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
    } catch (error: unknown) {
      if (error instanceof GitError) {
        return errAsync(new GitFileSystemError(error.message))
      }

      return errAsync(error)
    }

    return okAsync(null)
  }

  // TODO: Creates either directory or file
  // ResourceDirectoryService used this to create a directory + file at the same time
  async create() {}

  // Read the contents of a file
  async read(
    repoName: string,
    filePath: string
  ): Promise<Result<GitFile, GitFileSystemError | unknown>> {
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
      if (error instanceof Error) {
        return errAsync(new GitFileSystemError(error.message))
      }

      return errAsync(error)
    }
  }

  // Read the contents of a directory
  async listDirectoryContents(
    repoName: string,
    directoryPath: string
  ): Promise<Result<GitDirectoryItem[], GitFileSystemError | unknown>> {
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
      if (error instanceof Error) {
        // Likely the path does not exist
        return errAsync(new GitFileSystemError(error.message))
      }

      return errAsync(error)
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
      if (error instanceof Error) {
        return errAsync(new GitFileSystemError(error.message))
      }

      return errAsync(error)
    }
  }

  // TODO: Update the contents of a file
  async update() {}

  // TODO: Delete a file
  async delete() {}

  // TODO: Get the latest commit of branch
  async getLatestCommitOfBranch() {}
}
