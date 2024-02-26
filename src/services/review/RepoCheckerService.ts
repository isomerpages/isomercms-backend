import fs from "fs"
import path from "path"

import jsdom from "jsdom"
import { forEach } from "lodash"
import { marked } from "marked"
import { ResultAsync, errAsync, ok } from "neverthrow"

import { EFS_VOL_PATH_STAGING } from "@root/constants"
import SiteCheckerError from "@root/errors/SiteCheckerError"
import { RepoError } from "@root/types/siteChecker"
import { ALLOWED_FILE_EXTENSIONS } from "@root/utils/file-upload-utils"

const { JSDOM } = jsdom

export default class RepoCheckerService {
  getAllRepos(): ResultAsync<string[], Error> {
    // todo
    return errAsync(new Error("Not implemented"))
  }

  runCheckerForAllRepos(): ResultAsync<undefined, Error> {
    // todo
    return errAsync(new Error("Not implemented"))
  }

  async checkRepo(repo: string) {
    const repoPath = path.join(EFS_VOL_PATH_STAGING, repo)

    const mdFiles = new Set<string>()
    // get list of all documents
    const checker = this.getListOfMarkdownFiles(repoPath)
      .andThen((files) => {
        files.forEach((file) => {
          mdFiles.add(file)
        })
        return this.getAllMediaPath(repoPath)
      })
      .andThen((setOfAllMediaPath) =>
        ResultAsync.fromPromise(
          this.getAllPermalinks(repoPath, mdFiles),
          (error) => new SiteCheckerError(`${error}`)
        ).andThen((setOfAllPermalinks) =>
          ok(new Set([...setOfAllMediaPath, ...setOfAllPermalinks]))
        )
      )
      .andThen((setOfAllMediaAndPagesPath) => {
        mdFiles.forEach(async (fileName) => {
          const file = fs.readFileSync(path.join(repoPath, fileName), "utf8")
          const filePermalink = file
            .split("---")[1]
            .split("permalink: ")[1]
            .split("\n")[0]
          const fileContent = file.split("---")[2]
          if (!fileContent) {
            return
          }
          const html = await marked.parse(fileContent)
          const dom = new JSDOM(html)
          const anchorTags = dom.window.document.querySelectorAll("a")
          forEach(anchorTags, (tag) => {
            const href = tag.getAttribute("href")
            const text = tag.textContent
            if (href) {
              const decodedHref = this.documentPathDecoder(href)
              if (
                !this.isExternalLinkOrPageRef(decodedHref) &&
                !setOfAllMediaAndPagesPath.has(decodedHref) &&
                // Amplify supports adding of trailing slash
                !setOfAllMediaAndPagesPath.has(`${decodedHref}/`)
              ) {
                this.persistLogs(repo, [
                  new SiteCheckerError(
                    `Broken link ${href} that links ${text} found in ${fileName} which has permalink ${filePermalink}`
                  ),
                ])
              }
            }
          })
          const imgTags = dom.window.document.querySelectorAll("img")
          forEach(imgTags, (tag) => {
            const src = tag.getAttribute("src")
            if (src) {
              const decodedSrc = this.documentPathDecoder(src)
              if (
                !this.isExternalLinkOrPageRef(decodedSrc) &&
                !setOfAllMediaAndPagesPath.has(decodedSrc)
              ) {
                this.persistLogs(repo, [
                  new SiteCheckerError(
                    `Broken image ${src} found in ${fileName} which has permalink ${filePermalink}`
                  ),
                ])
              }
            }
          })
        })
        return ok(undefined)
      })
  }

  isExternalLinkOrPageRef(link: string) {
    return (
      link.startsWith("https://") ||
      link.startsWith("http://") ||
      link.startsWith("mailto:") ||
      link.startsWith("#")
    )
  }

  documentPathDecoder(documentPath: string) {
    for (let i = 0; i < ALLOWED_FILE_EXTENSIONS.length; i += 1) {
      if (documentPath.endsWith(ALLOWED_FILE_EXTENSIONS[i])) {
        return decodeURI(documentPath)
      }
    }
    return documentPath
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

  persistLogs(repo: string, errors: SiteCheckerError[]) {
    // create a log file in the root dir of all repos, in case of multiple errors
    const logFilePath = path.join(process.cwd(), `log.txt`)

    const logFile = fs.createWriteStream(logFilePath, { flags: "a" })
    forEach(errors, (error) => {
      logFile.write(`${error}\n`)
    })
    logFile.end()
  }

  emailErrors(errors: RepoError[]): ResultAsync<undefined, Error> {
    // todo: send email to admin@isomer.gov.sg
    return errAsync(new Error("Not implemented"))
  }

  getAllMediaPath(dirPath: string): ResultAsync<Set<string>, SiteCheckerError> {
    const filesRootDir = path.join(dirPath, "files")
    const imagesRootDir = path.join(dirPath, "images")

    return ResultAsync.fromPromise(
      this.traverseDirectory(filesRootDir, dirPath),
      (e) => new SiteCheckerError(`Failed to traverse directory: ${e}`)
    ).andThen((assetFilesPath) =>
      ResultAsync.fromPromise(
        this.traverseDirectory(imagesRootDir, dirPath),
        (e) => new SiteCheckerError(`Failed to traverse directory: ${e}`)
      ).map((imagesPath) => new Set([...assetFilesPath, ...imagesPath]))
    )
  }

  // todo: refactor to use neverthrow
  async traverseDirectory(dir: string, relativePath: string) {
    const filePaths = new Set<string>()
    const files = await fs.promises.readdir(dir, {
      recursive: true,
      withFileTypes: true,
    })

    const promises = files.map(async (entry) => {
      const res = path.resolve(relativePath, path.join(entry.path, entry.name))
      if (!entry.isDirectory()) {
        filePaths.add(decodeURIComponent(res.slice(relativePath.length)))
      }
    })
    await Promise.all(promises)
    return filePaths
  }

  // todo: refactor to use neverthrow
  async getAllPermalinks(repoPath: string, mdFiles: Set<string>) {
    const setOfAllPermalinks = new Set<string>()
    const files = [...mdFiles]

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
            this.persistLogs(repoPath, [
              new SiteCheckerError(
                `Duplicate permalink ${permalink} found in ${file}`
              ),
            ])
          } else {
            setOfAllPermalinks.add(permalink)
          }
        })
      })

    await Promise.all(promises)

    // this should be only after all files have been parsed
    return setOfAllPermalinks
  }
}
