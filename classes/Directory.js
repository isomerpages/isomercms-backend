const axios = require("axios")
const _ = require("lodash")
const validateStatus = require("../utils/axios-utils")

const { BadRequestError } = require("../errors/BadRequestError")
const { NotFoundError } = require("../errors/NotFoundError")

const { GITHUB_ORG_NAME } = process.env
const { BRANCH_REF } = process.env

class RootType {
  constructor() {
    this.folderName = ""
  }

  getFolderName() {
    return this.folderName
  }
}

class FolderType {
  constructor(folderPath) {
    this.folderName = folderPath
  }

  getFolderName() {
    return this.folderName
  }
}

class ResourceRoomType {
  constructor(resourceRoomName) {
    this.folderName = `${resourceRoomName}`
  }

  getFolderName() {
    return this.folderName
  }
}

class Directory {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
    this.dirType = null
  }

  setDirType(dirType) {
    this.dirType = dirType
    const folderPath = dirType.getFolderName()
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/${folderPath}`
  }

  async list() {
    const endpoint = `${this.baseEndpoint}`

    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status !== 200) {
      if (this.dirType instanceof FolderType) {
        if (resp.status === 404)
          throw new NotFoundError(
            `Path ${this.dirType.getFolderName()} was not found!`
          )
        throw new BadRequestError(
          `Path ${this.dirType.getFolderName()} was invalid!`
        )
      }
      return {}
    }

    if (this.dirType instanceof FolderType) {
      // Validation
      if (!Array.isArray(resp.data)) {
        throw new BadRequestError(
          `The provided path, ${endpoint}, is not a directory`
        )
      }

      const filesOrDirs = resp.data.map((fileOrDir) => {
        const { name, path, sha, size, content, type } = fileOrDir
        return {
          name,
          path,
          sha,
          size,
          content,
          type,
        }
      })

      return _.compact(filesOrDirs)
    }

    if (this.dirType instanceof ResourceRoomType) {
      const directories = resp.data
        .filter((object) => {
          return object.type === "dir"
        })
        .map((object) => {
          const pathNameSplit = object.path.split("/")
          const dirName = pathNameSplit[pathNameSplit.length - 1]
          return {
            path: encodeURIComponent(object.path),
            dirName,
          }
        })
      return directories
    }

    return resp.data
  }
}

module.exports = {
  Directory,
  RootType,
  FolderType,
  ResourceRoomType,
}
