/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
import fs from "fs"
import path from "path"

import jsdom from "jsdom"
import _, { forEach } from "lodash"
import { marked } from "marked"
import { ResultAsync, errAsync, ok, okAsync } from "neverthrow"
import Papa from "papaparse"
import { ModelStatic } from "sequelize"
import { CommitResult, PushResult, SimpleGit, Response } from "simple-git"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import config from "@root/config/config"
import { EFS_VOL_PATH_STAGING, STAGING_BRANCH } from "@root/constants"
import { Deployment, Repo, Site, SiteMember } from "@root/database/models"
import { BaseIsomerError } from "@root/errors/BaseError"
import MissingResourceRoomError from "@root/errors/MissingResourceRoomError"
import { NotFoundError } from "@root/errors/NotFoundError"
import SiteCheckerError from "@root/errors/SiteCheckerError"
import logger from "@root/logger/logger"
import {
  RepoErrorTypes,
  RepoError,
  isRepoError,
  BrokenLinkErrorDto,
} from "@root/types/siteChecker"
import { extractPathInfo } from "@root/utils/files"

import GitFileSystemService from "../db/GitFileSystemService"
import { PageService } from "../fileServices/MdPageServices/PageService"

const { JSDOM } = jsdom

interface RepoCheckerServiceProps {
  siteMemberRepository: ModelStatic<SiteMember>
  repoRepository: ModelStatic<Repo>
  gitFileSystemService: GitFileSystemService
  git: SimpleGit
  pageService: PageService
}

export const SITE_CHECKER_REPO_NAME = "isomer-site-checker"

export const SITE_CHECKER_REPO_PATH = path.join(
  config.get("aws.efs.volPath"),
  SITE_CHECKER_REPO_NAME
)

const LOCK_CONTENT = "checker.lock"
const REPO_ERROR_LOG = "error.log"
const REPO_LOG = "log.csv"

export default class RepoCheckerService {
  private readonly siteMemberRepository: RepoCheckerServiceProps["siteMemberRepository"]

  private readonly gitFileSystemService: RepoCheckerServiceProps["gitFileSystemService"]

  private readonly git: RepoCheckerServiceProps["git"]

  private readonly repoRepository: RepoCheckerServiceProps["repoRepository"]

  private readonly pageService: RepoCheckerServiceProps["pageService"]

  constructor({
    siteMemberRepository,
    repoRepository,
    gitFileSystemService,
    git,
    pageService,
  }: RepoCheckerServiceProps) {
    this.siteMemberRepository = siteMemberRepository
    this.gitFileSystemService = gitFileSystemService
    this.git = git
    this.repoRepository = repoRepository
    this.pageService = pageService
  }

  isCurrentlyLocked(repo: string): ResultAsync<true, SiteCheckerError> {
    const logsFilePath = path.join(SITE_CHECKER_REPO_PATH, repo)
    // create logs folder if it does not exist

    if (!fs.existsSync(logsFilePath)) {
      fs.mkdirSync(logsFilePath, { recursive: true })
    }

    // check if checker.lock exists
    const lockFilePath = path.join(logsFilePath, LOCK_CONTENT)

    return ResultAsync.fromPromise(
      fs.promises.access(lockFilePath, fs.constants.F_OK),
      (err) => new SiteCheckerError(`${err}`)
    ).map(() => true)
  }

  createLock(repo: string) {
    const folderPath = path.join(SITE_CHECKER_REPO_PATH, repo)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    // create a checker.lock file
    const lockFilePath = path.join(folderPath, LOCK_CONTENT)
    return ResultAsync.fromPromise(
      fs.promises.writeFile(lockFilePath, "locked"),
      (error) => new SiteCheckerError(`${error}`)
    )
  }

  deleteLock(repo: string) {
    const lockFilePath = path.join(SITE_CHECKER_REPO_PATH, repo, LOCK_CONTENT)
    return ResultAsync.fromPromise(
      fs.promises.unlink(lockFilePath),
      (error) => new SiteCheckerError(`${error}`)
    )
  }

  createErrorLog(repo: string, error: SiteCheckerError) {
    const errorLogFilePath = path.join(
      SITE_CHECKER_REPO_PATH,
      repo,
      REPO_ERROR_LOG
    )
    return ResultAsync.fromPromise(
      fs.promises.writeFile(errorLogFilePath, error.message),
      (err) => new SiteCheckerError(`${err}`)
    ).mapErr((err) => {
      logger.error(
        `SiteCheckerError: Error creating error log for repo ${repo}: ${err}`
      )
      return err
    })
  }

  isCurrentlyErrored(repo: string): ResultAsync<boolean, SiteCheckerError> {
    const errorLogFilePath = path.join(
      SITE_CHECKER_REPO_PATH,
      repo,
      REPO_ERROR_LOG
    )
    return ResultAsync.fromPromise(
      fs.promises.access(errorLogFilePath, fs.constants.F_OK),
      (err) => new SiteCheckerError(`${err}`)
    )
      .map(() => true)
      .orElse(() => okAsync(false))
  }

  deleteErrorLog(repo: string) {
    const errorLogFilePath = path.join(
      SITE_CHECKER_REPO_PATH,
      repo,
      REPO_ERROR_LOG
    )
    return ResultAsync.fromPromise(
      fs.promises.unlink(errorLogFilePath),
      (error) => new SiteCheckerError(`${error}`)
    ).mapErr((error) => {
      logger.error(
        `SiteCheckerError: Error deleting error log for repo ${repo}: ${error}`
      )
      return error
    })
  }

  /**
   * NOTE: This gets all the repos that have site members only
   * We want to exclude GH-login folks from using this feature
   */
  getAllRepos(): ResultAsync<string[], SiteCheckerError> {
    return ResultAsync.fromPromise(
      this.siteMemberRepository.findAll({
        include: [
          {
            model: Site,
            required: true,
            include: [
              {
                model: Repo,
                required: true,
              },
              {
                model: Deployment,
                required: true,
              },
            ],
          },
        ],
      }),
      (error) => new SiteCheckerError(`${error}`)
    )
      .map((siteMembers) =>
        siteMembers.map(
          (siteMember) => siteMember.dataValues.site.repo.dataValues.name
        )
      )
      .andThen((repos) => {
        const uniqueRepos: string[] = _.uniq(repos)
        return ok(uniqueRepos)
      })
  }

  getStagingLinkFromRepoName(
    repoName: string
  ): ResultAsync<string, SiteCheckerError> {
    return ResultAsync.fromPromise(
      this.repoRepository.findOne({
        where: {
          name: repoName,
        },
        include: [
          {
            model: Site,
            required: true,
            include: [
              {
                model: Deployment,
                required: true,
              },
            ],
          },
        ],
      }),
      (error) => new SiteCheckerError(`${error}`)
    ).andThen((repo) => {
      // we still return something even if not found as
      // the permalink might still be useful to user
      if (!repo) return ok("")
      return okAsync(repo.dataValues.site.deployment.dataValues.stagingUrl)
    })
  }

  runCheckerForAllRepos(): ResultAsync<
    undefined,
    SiteCheckerError | SiteCheckerError[]
  > {
    return this.getAllRepos().andThen((repos) => this.runCheckerForRepos(repos))
  }

  runCheckerForRepos(
    repos: string[]
  ): ResultAsync<undefined, SiteCheckerError[]> {
    return ResultAsync.fromPromise(
      this.runCheckerForReposInSeq(repos),
      (error) => [new SiteCheckerError(`${error}`)]
    )
      .andThen(() => ok(undefined))
      .orElse((errors) => {
        logger.error(
          `SiteCheckerError: Error running site checker for repos: ${errors}`
        )
        return errAsync(errors)
      })
  }

  /**
   * Run the site checker for all repos sequentially
   * Not using neverthrow here as we want to run all the checkers
   * in sequence without short circuiting, and neverthrow does not
   * support this.
   */
  async runCheckerForReposInSeq(repos: string[]): Promise<void> {
    for (const repoName of repos) {
      // this is only triggered via the formsg for admins, therefore can construct a mock
      const userWithSiteSessionData = ({
        siteName: repoName,
      } as unknown) as UserWithSiteSessionData
      const result = await this.runBrokenLinkChecker(
        userWithSiteSessionData,
        true
      )
      if (result.isErr()) {
        logger.error(`Something went wrong when checking repo: ${result.error}`)
      }
    }
  }

  cloner(repo: string): ResultAsync<boolean, SiteCheckerError> {
    return this.gitFileSystemService
      .isValidGitRepo(repo, STAGING_BRANCH)
      .andThen((isValidGitRepo) => {
        if (isValidGitRepo) {
          return okAsync(false)
        }

        logger.info(
          `Repo ${repo} does not exist in efs for site checker, cloning...`
        )
        // it is ok if file does not exist, just clone it for now
        return this.gitFileSystemService
          .cloneBranch(repo, true)
          .map(() => true)
          .mapErr((error) => new SiteCheckerError(`${error}`))
      })
      .mapErr((error) => new SiteCheckerError(`${error}`))
  }

  // This function removes the recently cloned repo. This function should only be called in non-prod environments
  remover(repo: string) {
    const NODE_ENV = config.get("env")
    if (NODE_ENV === "prod") {
      // by right this should not happen,
      // but just in case safely return without doing anything
      return okAsync(undefined)
    }

    return this.gitFileSystemService
      .removeRepo(repo, STAGING_BRANCH)
      .mapErr((error) => new SiteCheckerError(`${error}`))
  }

  getMapOfMdFilesAndViewableLinkInCms(
    repoPath: string,
    userWithSiteSessionData: UserWithSiteSessionData
  ) {
    return this.getListOfMarkdownFiles(repoPath).andThen((files) => {
      const mapOfMdFilesAndViewableLinkInCms = new Map<string, string>()
      const results: ResultAsync<
        Map<string, string>,
        NotFoundError | BaseIsomerError | MissingResourceRoomError
      >[] = []
      for (const file of files) {
        results.push(
          this.getPathInCms(
            file,
            userWithSiteSessionData
          ).map((viewablePageInCms) =>
            mapOfMdFilesAndViewableLinkInCms.set(file, viewablePageInCms)
          )
        )
      }
      return ResultAsync.combineWithAllErrors(results)
        .map(() => mapOfMdFilesAndViewableLinkInCms)
        .orElse((error) => {
          // Some repos have an inconsistent structure, the entire site checker should not fail because of this
          logger.info(
            `SiteCheckerInfo: Error getting viewable link in cms, ${error} for repo ${repoPath}`
          )
          return okAsync(mapOfMdFilesAndViewableLinkInCms)
        })
    })
  }

  checker(
    repo: string,
    userWithSiteSessionData: UserWithSiteSessionData
  ): ResultAsync<RepoError[], SiteCheckerError> {
    const repoPath = path.join(EFS_VOL_PATH_STAGING, repo)
    let mapOfMdFilesAndViewableLinkInCms = new Map<string, string>()
    const errors: RepoError[] = []
    return this.getMapOfMdFilesAndViewableLinkInCms(
      repoPath,
      userWithSiteSessionData
    )
      .andThen((map) => {
        mapOfMdFilesAndViewableLinkInCms = map
        return this.getAllMediaPath(repoPath)
      })
      .andThen((setOfAllMediaPath) =>
        ResultAsync.fromPromise(
          this.getAllPermalinks(
            repoPath,
            [...mapOfMdFilesAndViewableLinkInCms.keys()],
            userWithSiteSessionData
          ),
          (error) => new SiteCheckerError(`${error}`)
        ).andThen(([setOfAllPermalinks, duplicatePermalinkErrors]) => {
          errors.push(...duplicatePermalinkErrors)
          return ok(new Set([...setOfAllMediaPath, ...setOfAllPermalinks]))
        })
      )
      .andThen((setOfAllMediaAndPagesPath) => {
        const findErrors = []
        for (const [
          fileName,
          viewablePageInCms,
        ] of mapOfMdFilesAndViewableLinkInCms) {
          const file = fs.readFileSync(path.join(repoPath, fileName), "utf8")

          const filePermalink = file
            .split("---")
            ?.at(1)
            ?.split("permalink: ")
            ?.at(1)
            ?.split("\n")
            ?.at(0)

          if (!filePermalink) {
            continue
          }
          const normalisedPermalink = this.normalisePermalink(filePermalink)

          // we are only parsing out the front matter
          const fileContent = file.split("---")?.slice(2).join("---")
          if (!fileContent) {
            continue
          }
          findErrors.push(
            ResultAsync.fromPromise(
              Promise.resolve(marked.parse(fileContent)),
              (err) => new SiteCheckerError(`${err}`)
            ).andThen((html) => {
              const dom = new JSDOM(html)
              const anchorTags = dom.window.document.querySelectorAll("a")
              forEach(anchorTags, (tag) => {
                const href = tag.getAttribute("href")
                const text = tag.textContent

                if (!text) {
                  // while rendered in the dom, unlikely to be
                  // noticed by end citizen.
                  return
                }
                if (!tag.hasAttribute("href")) {
                  const error: RepoError = {
                    type: RepoErrorTypes.BROKEN_LINK,
                    linkToAsset: "",
                    viewablePageInCms,
                    viewablePageInStaging: path.join(normalisedPermalink),
                    linkedText: text,
                  }
                  errors.push(error)
                }
                if (!href) {
                  // could be intentional linking to self
                  // eg. <a href>Back to top</a>
                  return
                }

                if (!this.hasValidReference(setOfAllMediaAndPagesPath, href)) {
                  const error: RepoError = {
                    type: RepoErrorTypes.BROKEN_LINK,
                    linkToAsset: href,
                    viewablePageInCms,
                    viewablePageInStaging: path.join(normalisedPermalink),
                    linkedText: text,
                  }
                  errors.push(error)
                }
              })
              const imgTags = dom.window.document.querySelectorAll("img")
              forEach(imgTags, (tag) => {
                const src = tag.getAttribute("src")
                if (!src) {
                  // while rendered in the dom, unlikely to be
                  // noticed by end citizen.
                  return
                }

                //! todo: include check for post bundled files https://github.com/isomerpages/isomerpages-template/tree/staging/assets/img
                if (!this.hasValidReference(setOfAllMediaAndPagesPath, src)) {
                  const error: RepoError = {
                    type: RepoErrorTypes.BROKEN_IMAGE,
                    linkToAsset: src,
                    viewablePageInCms,
                    viewablePageInStaging: path.join(normalisedPermalink),
                  }
                  errors.push(error)
                }
              })
              return ok(undefined)
            })
          )
        }
        logger.info(`Site checker for repo ${repo} completed successfully!`)
        return ResultAsync.combineWithAllErrors(findErrors)
          .orElse((e) => {
            logger.error(
              `SiteCheckerError: Error running site checker for repo ${repo}: ${e}`
            )
            // it is ok to have errors, still report the found errors for now
            return okAsync([undefined])
          })
          .andThen(() => okAsync(errors))
      })
  }

  hasValidReference(setOfAllMediaAndPagesPath: Set<string>, src: string) {
    if (this.isExternalLinkOrPageRef(src)) {
      return true
    }

    const decodedSrc = this.mediaPathDecoder(src)

    if (setOfAllMediaAndPagesPath.has(decodedSrc)) {
      return true
    }

    // Amplify allows for trailing slash
    if (setOfAllMediaAndPagesPath.has(`${decodedSrc}/`)) {
      return true
    }
    return false
  }

  reporter(repo: string, errors: RepoError[]): ResultAsync<RepoError[], never> {
    const folderPath = path.join(SITE_CHECKER_REPO_PATH, repo)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    const filePath = path.join(SITE_CHECKER_REPO_PATH, repo, REPO_LOG)
    const stringifiedErrors = this.convertToCSV(errors)
    if (!fs.existsSync(filePath)) {
      fs.appendFileSync(filePath, stringifiedErrors)
    } else {
      fs.writeFileSync(filePath, stringifiedErrors)
    }

    const isProd = config.get("env") === "prod"
    if (!isProd) {
      return okAsync(errors)
    }

    const gitOperations:
      | Response<CommitResult>
      | Response<PushResult> = this.git
      .cwd({ path: SITE_CHECKER_REPO_PATH, root: false })
      .checkout("main")
      .fetch()
      .merge(["origin/main"])
      .add(["."])
      .commit(`Site checker logs added for ${repo}`)
      .push()

    // pushing since there is no real time requirement for user
    return ResultAsync.fromPromise<CommitResult | PushResult, SiteCheckerError>(
      gitOperations,
      (error) => new SiteCheckerError(`${error}`)
    )
      .map(() => errors)
      .orElse(() => {
        /**
         * Actually committing the repo to remote is not a critical operation, and done for observability.
         * If it fails, we can still return the broken links report to the user.
         * We also do not want to log the actual error as it could cause other alarms to go off.
         */
        logger.info(
          `SiteCheckerInfo: Error pushing logs for ${repo} to remote isomer-site-checker repo`
        )
        return ok(errors)
      })
  }

  // adapted from https://stackoverflow.com/questions/56427009/how-to-return-papa-parsed-csv-via-promise-async-await
  generateRepoErrorsFromCsv = (repo: string): Promise<RepoError[]> => {
    const filePath = path.join(SITE_CHECKER_REPO_PATH, repo, REPO_LOG)
    const file = fs.createReadStream(filePath)
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete(results) {
          // validate the csv
          if (!results.data.every(isRepoError)) {
            reject(new Error("Invalid CSV"))
          }
          resolve(results.data as RepoError[])
        },
        error(error) {
          reject(error)
        },
      })
    })
  }

  readRepoErrors = (
    repo: string
  ): ResultAsync<BrokenLinkErrorDto, SiteCheckerError> => {
    const filePath = path.join(SITE_CHECKER_REPO_PATH, repo, REPO_LOG)
    if (!fs.existsSync(filePath)) {
      logger.error(`SiteCheckerError: Folder does not exist for ${repo}`)
      return errAsync(new SiteCheckerError(`Folder does not exist for ${repo}`))
    }

    return this.isCurrentlyErrored(repo).andThen((isError) => {
      if (isError) {
        return errAsync(new SiteCheckerError(`Error checking repo ${repo}`))
      }

      return this.isCurrentlyLocked(repo)
        .andThen(() => okAsync<BrokenLinkErrorDto>({ status: "loading" }))
        .orElse(() =>
          ResultAsync.fromPromise(
            this.generateRepoErrorsFromCsv(repo),
            (error) => {
              logger.error(
                `SiteCheckerError: Error reading csv for repo ${repo}: ${error}`
              )
              return new SiteCheckerError(
                `Error reading csv for repo ${repo}: ${error}`
              )
            }
          ).andThen((errors) =>
            okAsync<BrokenLinkErrorDto>({
              errors,
              status: "success",
            })
          )
        )
    })
  }

  /**
   * Run the broken link checker for a single repo
   * @param repo - the name of the repo to check
   * @param isBlocking - whether the operation should only return after completion/error thrown of the check
   * @returns a promise that resolves to the result of the check
   * @throws an error if the operation fails
   * @remarks
   * isBlocking is used to determine if the operation should return early with a loading state, or only return after the check is completed.
   * As such, a user triggered operation should not be blocking, while an automated operation should be blocking.
   */
  runBrokenLinkChecker(
    userWithSiteSessionData: UserWithSiteSessionData,
    isBlocking = false
  ): ResultAsync<BrokenLinkErrorDto, SiteCheckerError> {
    /**
     * To allow for an easy running of the script, we can temporarily clone
     * the repo to the EFS
     */
    const { siteName: repo } = userWithSiteSessionData
    logger.info(`Link checker for ${repo} started`)

    // time the process taken to check the repo
    const startTime = process.hrtime()
    return this.isCurrentlyLocked(repo)
      .andThen(() => okAsync<BrokenLinkErrorDto>({ status: "loading" }))
      .orElse(() =>
        this.isCurrentlyErrored(repo).andThen((isError) => {
          let blockingOperation

          if (isError) {
            // delete the error.log file + retry, safe operation since this is only user triggered and not automated
            blockingOperation = this.deleteErrorLog(repo).andThen(() =>
              this.checkRepo(repo, startTime, userWithSiteSessionData)
            )
          } else {
            // this process can run async, so we can just return the loading state early
            blockingOperation = this.checkRepo(
              repo,
              startTime,
              userWithSiteSessionData
            )
          }

          if (isBlocking) {
            return blockingOperation
          }
          return okAsync<BrokenLinkErrorDto>({ status: "loading" })
        })
      )
  }

  getPathInCms = (permalink: string, sessionData: UserWithSiteSessionData) => {
    const pathInfo = extractPathInfo(permalink)
    if (pathInfo.isErr()) {
      return errAsync(new SiteCheckerError("Invalid permalink"))
    }
    const { siteName } = sessionData
    const baseUrl = `/sites/${siteName}`
    return this.pageService
      .parsePageName(pathInfo.value, sessionData)
      .andThen((page) =>
        this.pageService.retrieveRelativeCmsPermalink(page, baseUrl)
      )
  }

  checkRepo = (
    repo: string,
    start: [number, number],
    userWithSiteSessionData: UserWithSiteSessionData
  ): ResultAsync<BrokenLinkErrorDto, SiteCheckerError> =>
    this.createLock(repo).andThen(() =>
      this.cloner(repo)
        .andThen((cloned) => {
          const repoExists = !cloned

          return this.checker(repo, userWithSiteSessionData)
            .andThen((errors) => this.reporter(repo, errors))
            .map<BrokenLinkErrorDto>((errors) => ({
              status: "success",
              errors,
            }))

            .andThen((errors) => {
              if (repoExists) {
                return ok(errors)
              }
              // since this repo was cloned during this operation, we should remove it
              return this.remover(repo).andThen(() => ok(errors))
            })
            .andThen((errors) =>
              this.deleteLock(repo).andThen(() => {
                const end = process.hrtime(start)
                logger.info(`Link checker for ${repo} completed in ${end[0]}s`)
                return ok(errors)
              })
            )
            .orElse((error) => {
              this.deleteLock(repo)
              return errAsync(error)
            })
        })
        .mapErr((error) => {
          // create error.log file
          this.createErrorLog(repo, error)
          return error
        })
        .mapErr((error) => {
          logger.error(
            `SiteCheckerError: Error checking repo ${repo}: ${error}`
          )
          return error
        })
    )

  convertToCSV(errors: RepoError[]) {
    const data = errors.map((error) => ({
      type: error.type,
      linkToAsset: "linkToAsset" in error ? error.linkToAsset : "",
      viewablePageInCms:
        "viewablePageInCms" in error ? error.viewablePageInCms : "",
      viewablePageInStaging:
        "viewablePageInStaging" in error ? error.viewablePageInStaging : "",
      linkedText: "linkedText" in error ? error.linkedText : "",
      permalink: "permalink" in error ? error.permalink : "",
      pagesUsingPermalink:
        "pagesUsingPermalink" in error
          ? error.pagesUsingPermalink.join(", ")
          : "",
    }))

    return Papa.unparse(data) as string
  }

  isExternalLinkOrPageRef(link: string) {
    // todo: check for schema rather than just substrings
    const trimmedLink = link.trim()
    return (
      // intentionally allowing http to lessen user confusion
      trimmedLink.startsWith("http://") ||
      trimmedLink.startsWith("https://") ||
      trimmedLink.startsWith("mailto:") ||
      trimmedLink.startsWith("#") ||
      trimmedLink.startsWith("tel:") ||
      trimmedLink.startsWith("sms:")
    )
  }

  getTemplateMedia() {
    // grab all file paths from https://github.com/isomerpages/isomerpages-template/tree/staging/assets/img,
    // by making a curl call and storing in memory

    return ResultAsync.fromPromise(
      this.traverseDirectory(
        path.join(
          EFS_VOL_PATH_STAGING,
          "isomerpages-template",
          "assets",
          "img"
        ),
        ""
      ),
      (error) => new SiteCheckerError(`Failed to traverse directory: ${error}`)
    )
  }

  mediaPathDecoder = (mediaPath: string) => {
    let pathWithoutQueryParams = mediaPath
    if (!mediaPath.includes("?")) {
      pathWithoutQueryParams = mediaPath.split("?").at(0) || ""
    }

    return decodeURIComponent(pathWithoutQueryParams)
  }

  getListOfMarkdownFiles(
    repoPath: string
  ): ResultAsync<Set<string>, SiteCheckerError> {
    const setOfAllMarkdownFiles = new Set<string>()
    return ResultAsync.fromPromise(
      fs.promises.readdir(repoPath, { recursive: true }),
      (error) => new SiteCheckerError(`${error}`)
    ).andThen((files) => {
      files
        .filter((file) => !file.startsWith(".") && file.endsWith(".md"))
        .map((file) => {
          setOfAllMarkdownFiles.add(file)
          return ok(undefined)
        })
      return ok(setOfAllMarkdownFiles)
    })
  }

  getAllMediaPath(dirPath: string): ResultAsync<Set<string>, SiteCheckerError> {
    const filesRootDir = path.join(dirPath, "files")
    const imagesRootDir = path.join(dirPath, "images")

    return this.traverseDirectory(
      filesRootDir,
      dirPath
    ).andThen((assetFilesPath) =>
      this.traverseDirectory(imagesRootDir, dirPath).map(
        (imagesPath) => new Set([...assetFilesPath, ...imagesPath])
      )
    )
  }

  outputHumanReadableErrors(repoName: string) {
    const csvData = fs.readFileSync(
      path.join(SITE_CHECKER_REPO_PATH, repoName, REPO_LOG),
      "utf8"
    )

    const report: string[] = []

    Papa.parse(csvData, {
      header: true,
      complete(results) {
        results.data.forEach((row) => {
          if (!isRepoError(row)) return
          if (row.type === "broken-image") {
            report.push(`Broken image: ${row.linkToAsset}`)
            report.push(`Edit page: ${row.viewablePageInCms}`)
            report.push(`View page on staging: ${row.viewablePageInStaging}`)
            report.push("\n")
          } else if (row.type === "broken-file") {
            report.push(`Broken file: ${row.linkToAsset}`)
            report.push(`Linked text: ${row.linkedText}`)
            report.push(`Edit page: ${row.viewablePageInCms}`)
            report.push(`View page on staging: ${row.viewablePageInStaging}`)
            report.push("\n")
          } else if (row.type === "broken-link") {
            report.push(`Broken link: ${row.linkToAsset}`)
            report.push(`Linked text: ${row.linkedText}`)
            report.push(`Edit page: ${row.viewablePageInCms}`)
            report.push(`View page on staging: ${row.viewablePageInStaging}`)
            report.push("\n")
          } else if (row.type === "duplicate-permalink") {
            report.push(`Permalink: ${row.permalink}`)
            report.push(
              `Pages using the same permalink: ${row.pagesUsingPermalink}`
            )
            report.push("\n")
          }
        })
      },
    })

    // write report to file
    fs.writeFileSync(
      path.join(SITE_CHECKER_REPO_PATH, repoName, "report.txt"),
      report.join("\n")
    )
  }

  traverseDirectory(
    dir: string,
    relativePath: string
  ): ResultAsync<Set<string>, SiteCheckerError> {
    const filePaths = new Set<string>()
    return ResultAsync.fromPromise(
      fs.promises.readdir(dir, {
        recursive: true,
        withFileTypes: true,
      }),
      (error) => new SiteCheckerError(`${error}`)
    ).andThen((files) => {
      files.map((entry) => {
        const res = path.resolve(
          relativePath,
          path.join(entry.path, entry.name)
        )
        if (!entry.isDirectory()) {
          filePaths.add(decodeURIComponent(res.slice(relativePath.length)))
        }
        return entry
      })

      return ok(filePaths)
    })
  }

  normalisePermalink(permalink: string) {
    let finalPermalink = permalink.replace(/^['"]|['"]$/g, "")

    if (!finalPermalink.startsWith("/")) {
      finalPermalink = `/${finalPermalink}`
    }

    return finalPermalink
  }

  // todo: refactor to use neverthrow
  async getAllPermalinks(
    repoPath: string,
    mdFiles: string[],
    userWithSiteSessionData: UserWithSiteSessionData
  ) {
    const setOfAllPermalinks = new Set<string>()
    const files = mdFiles
    const errors: RepoError[] = []
    const promises = files
      .filter((file) => !file.startsWith(".") && file.endsWith(".md")) // should not have .git
      .map(async (file) => {
        const regex = /(permalink: ){1}(.*)/gm
        const fileContent = await fs.promises.readFile(
          path.join(repoPath, file),
          "utf8"
        )
        // match regex against file
        const matches = fileContent.match(regex)
        // if match, add to set
        matches?.forEach((match) => {
          const permalink = match.split(": ")[1].trim()
          // permalinks for posts are generated dynamically based on the file name, and thus wont have conflict
          if (!file.includes("_posts") && setOfAllPermalinks.has(permalink)) {
            const error: RepoError = {
              type: RepoErrorTypes.DUPLICATE_PERMALINK,
              permalink,
              pagesUsingPermalink: [file],
            }
            errors.push(error)
          } else {
            setOfAllPermalinks.add(this.normalisePermalink(permalink))
          }
        })
      })

    await Promise.all(promises)

    const resourceRoom = await this.pageService.extractResourceRoomName(
      userWithSiteSessionData
    )

    if (resourceRoom.isOk()) {
      setOfAllPermalinks.add(this.normalisePermalink(resourceRoom.value.name))
    }

    // this should be only after all files have been parsed
    return [setOfAllPermalinks, errors] as const
  }
}
