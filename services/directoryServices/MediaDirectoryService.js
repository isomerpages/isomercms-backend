const { BadRequestError } = require("@errors/BadRequestError")

const { GITHUB_ORG_NAME } = process.env

const PLACEHOLDER_FILE_NAME = ".keep"

const { isMediaPathValid } = require("@validators/validators")

class MediaDirectoryService {
  constructor({ baseDirectoryService, gitHubService }) {
    this.baseDirectoryService = baseDirectoryService
    this.gitHubService = gitHubService
  }

  async listFiles(reqDetails, { directoryName }) {
    // TODO: file preview handling
    const { siteName } = reqDetails
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media folder name")
    const mediaType = directoryName.split("/")[0]
    const { private: isPrivate } = await this.gitHubService.getRepoInfo(
      reqDetails
    )
    const files = await this.baseDirectoryService.list(reqDetails, {
      directoryName,
    })
    const resp = []
    for (const curr of files) {
      if (curr.type === "dir") {
        resp.push({
          name: curr.name,
          type: "dir",
        })
      }
      if (curr.type !== "file" || curr.name === PLACEHOLDER_FILE_NAME) continue
      const fileData = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${
          curr.path
        }${curr.path.endsWith(".svg") ? "?sanitize=true" : ""}`,
        name: curr.name,
        sha: curr.sha,
        mediaPath: `${directoryName}/${curr.name}`,
      }
      if (mediaType === "images" && isPrivate) {
        // Generate blob url
        const imageExt = curr.name.slice(curr.name.lastIndexOf(".") + 1)
        const contentType = `image/${imageExt === "svg" ? "svg+xml" : imageExt}`
        const { content } = await this.gitHubService.readMedia(reqDetails, {
          fileSha: curr.sha,
        })
        const blobURL = `data:${contentType};base64,${content}`
        fileData.mediaUrl = blobURL
      }
      resp.push(fileData)
    }
    return resp
  }

  async createMediaDirectory(reqDetails, { directoryName, objArray }) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    if (directoryName === "images" || directoryName === "files") {
      throw new BadRequestError("Cannot create root media directory")
    }
    const tokens = directoryName.split("/")
    const mediaType = tokens[0]
    const mediaDirectoryName = tokens.slice(1).join("/")

    await this.gitHubService.create(reqDetails, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName,
    })
    if (objArray && objArray.length !== 0) {
      // We can't perform these operations concurrently because of conflict issues
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      const pathTokens = directoryName.split("/")
      const oldDirectoryName = pathTokens.slice(0, -1).join("/")
      const targetFiles = objArray.map((file) => file.name)
      await this.baseDirectoryService.moveFiles(reqDetails, {
        oldDirectoryName,
        newDirectoryName: directoryName,
        targetFiles,
        message: `Moving media files from ${oldDirectoryName} to ${directoryName}`,
      })
    }
    return {
      mediaType,
      mediaDirectoryName,
    }
  }

  async renameMediaDirectory(reqDetails, { directoryName, newDirectoryName }) {
    if (!isMediaPathValid({ path: newDirectoryName }))
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    await this.baseDirectoryService.rename(reqDetails, {
      oldDirectoryName: directoryName,
      newDirectoryName,
      message: `Renaming media folder ${directoryName} to ${newDirectoryName}`,
    })
  }

  async deleteMediaDirectory(reqDetails, { directoryName }) {
    if (!isMediaPathValid({ path: directoryName }))
      throw new BadRequestError("Invalid media folder name")
    await this.baseDirectoryService.delete(reqDetails, {
      directoryName,
      message: `Deleting media folder ${directoryName}`,
    })
  }

  async moveMediaFiles(
    reqDetails,
    { directoryName, targetDirectoryName, objArray }
  ) {
    if (
      !isMediaPathValid({ path: directoryName }) ||
      !isMediaPathValid({ path: targetDirectoryName })
    )
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    const targetFiles = objArray.map((item) => item.name)

    await this.baseDirectoryService.moveFiles(reqDetails, {
      oldDirectoryName: directoryName,
      newDirectoryName: targetDirectoryName,
      targetFiles,
      message: `Moving media files from ${directoryName} to ${targetDirectoryName}`,
    })
  }
}

module.exports = { MediaDirectoryService }
