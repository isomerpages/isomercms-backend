const { BadRequestError } = require("@errors/BadRequestError")
const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const { slugifyCollectionName } = require("@utils/utils")

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]
const ISOMER_TEMPLATE_PROTECTED_DIRS = [
  "data",
  "includes",
  "site",
  "layouts",
  "files",
  "images",
  "misc",
  "pages",
]
const PLACEHOLDER_FILE_NAME = ".keep"

class CollectionDirectoryService {
  constructor({
    baseDirectoryService,
    navYmlService,
    collectionYmlService,
    moverService,
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.navYmlService = navYmlService
    this.collectionYmlService = collectionYmlService
    this.moverService = moverService
  }

  convertYmlToObjOrder(fileOrder) {
    function addSubcollection() {
      if (currSubcollectionName !== "") {
        processedFiles.push({
          name: currSubcollectionName,
          type: "dir",
          children: currSubcollectionFiles,
        })
        currSubcollectionName = ""
        currSubcollectionFiles = []
      }
    }

    let currSubcollectionName = ""
    let currSubcollectionFiles = []
    const processedFiles = []

    fileOrder.forEach((filePath) => {
      if (filePath.includes("/")) {
        const [subcollectionName, fileName] = filePath.split("/")
        if (subcollectionName !== currSubcollectionName) {
          addSubcollection()
          currSubcollectionName = subcollectionName
        }
        if (fileName !== ".keep") currSubcollectionFiles.push(fileName)
      } else {
        addSubcollection()
        processedFiles.push({
          name: filePath,
          type: "file",
        })
      }
    })
    addSubcollection()
    return processedFiles
  }

  convertObjToYmlOrder(objArr) {
    const fileOrder = []
    objArr.forEach((obj) => {
      if (obj.type === "dir") {
        const subcollectionName = obj.name
        fileOrder.push(`${subcollectionName}/${PLACEHOLDER_FILE_NAME}`)
        obj.children.forEach((fileName) => {
          fileOrder.push(`${subcollectionName}/${fileName}`)
        })
      } else {
        fileOrder.push(obj.name)
      }
    })
    return fileOrder
  }

  async listAllCollections(sessionData) {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
      directoryName: "",
    })
    return filesOrDirs.reduce((acc, curr) => {
      if (
        curr.type === "dir" &&
        !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
        curr.name.slice(0, 1) === "_"
      )
        acc.push({
          name: curr.path.slice(1),
          type: "dir",
        })
      return acc
    }, [])
  }

  async listFiles(sessionData, { collectionName }) {
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })

    return this.convertYmlToObjOrder(files)
  }

  async createDirectory(sessionData, { collectionName, objArray }) {
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
    if (/[^a-zA-Z0-9- ]/g.test(collectionName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in collection name"
      )
    }
    const slugifiedCollectionName = slugifyCollectionName(collectionName)
    await this.collectionYmlService.create(sessionData, {
      collectionName: slugifiedCollectionName,
    })
    if (objArray) {
      const orderArray = this.convertObjToYmlOrder(objArray)
      // We can't perform these operations concurrently because of conflict issues
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      for (const fileName of orderArray) {
        await this.moverService.movePage(sessionData, {
          fileName,
          newFileCollection: slugifiedCollectionName,
        })
      }
    }
    return {
      newDirectoryName: slugifiedCollectionName,
      items: objArray || [],
    }
  }

  async renameDirectory(sessionData, { collectionName, newDirectoryName }) {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in collection name"
      )
    }
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(newDirectoryName))
      throw new ConflictError(protectedFolderConflictErrorMsg(newDirectoryName))
    const slugifiedNewCollectionName = slugifyCollectionName(newDirectoryName)
    await this.baseDirectoryService.rename(sessionData, {
      oldDirectoryName: `_${collectionName}`,
      newDirectoryName: `_${slugifiedNewCollectionName}`,
      message: `Renaming collection ${collectionName} to ${slugifiedNewCollectionName}`,
    })
    await this.collectionYmlService.renameCollectionInOrder(sessionData, {
      oldCollectionName: collectionName,
      newCollectionName: slugifiedNewCollectionName,
    })
    await this.navYmlService.renameCollectionInNav(sessionData, {
      oldCollectionName: collectionName,
      newCollectionName: slugifiedNewCollectionName,
    })
  }

  async deleteDirectory(sessionData, { collectionName }) {
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
    await this.baseDirectoryService.delete(sessionData, {
      directoryName: `_${collectionName}`,
      message: `Deleting collection ${collectionName}`,
    })
    await this.navYmlService.deleteCollectionInNav(sessionData, {
      collectionName,
    })
  }

  async reorderDirectory(sessionData, { collectionName, objArray }) {
    const fileOrder = this.convertObjToYmlOrder(objArray)
    await this.collectionYmlService.updateOrder(sessionData, {
      collectionName,
      newOrder: fileOrder,
    })
    return objArray
  }

  async movePages(
    sessionData,
    { collectionName, targetCollectionName, targetSubcollectionName, objArray }
  ) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of objArray) {
      const fileName = file.name
      await this.moverService.movePage(sessionData, {
        fileName,
        oldFileCollection: collectionName,
        newFileCollection: targetCollectionName,
        newFileSubcollection: targetSubcollectionName,
      })
    }
  }
}

module.exports = { CollectionDirectoryService }
