const { BadRequestError } = require("@errors/BadRequestError")

const { deslugifyCollectionName } = require("@utils/utils")

const { hasSpecialCharInTitle } = require("@validators/validators")

const PLACEHOLDER_FILE_NAME = ".keep"

class SubcollectionDirectoryService {
  constructor({
    baseDirectoryService,
    collectionYmlService,
    moverService,
    subcollectionPageService,
    gitHubService,
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.collectionYmlService = collectionYmlService
    this.moverService = moverService
    this.subcollectionPageService = subcollectionPageService
    this.gitHubService = gitHubService
  }

  async listFiles(sessionData, { collectionName, subcollectionName }) {
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })
    const subcollectionFiles = files.filter(
      (fileName) =>
        fileName.startsWith(`${subcollectionName}/`) &&
        !fileName.includes(`/.keep`)
    )

    const subcollectionNameLength = `${subcollectionName}/`.length
    return subcollectionFiles.map((fileName) => ({
      name: fileName.substring(subcollectionNameLength),
      type: "file",
    }))
  }

  async createDirectory(
    sessionData,
    { collectionName, subcollectionName, objArray }
  ) {
    if (hasSpecialCharInTitle({ title: subcollectionName, isFile: false }))
      throw new BadRequestError(
        `Special characters not allowed when creating subdirectory. Given name: ${subcollectionName}`
      )
    const parsedSubcollectionName = deslugifyCollectionName(subcollectionName)
    const parsedDir = `_${collectionName}/${parsedSubcollectionName}`
    await this.gitHubService.create(sessionData, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName: parsedDir,
    })

    await this.collectionYmlService.addItemToOrder(sessionData, {
      collectionName,
      item: `${parsedSubcollectionName}/${PLACEHOLDER_FILE_NAME}`,
    })

    if (objArray) {
      // We can't perform these operations concurrently because of conflict issues
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      for (const file of objArray) {
        const fileName = file.name
        await this.moverService.movePage(sessionData, {
          fileName,
          oldFileCollection: collectionName,
          newFileCollection: collectionName,
          newFileSubcollection: parsedSubcollectionName,
        })
      }
    }
    return {
      newDirectoryName: parsedSubcollectionName,
      items: objArray || [],
    }
  }

  async renameDirectory(
    sessionData,
    { collectionName, subcollectionName, newDirectoryName }
  ) {
    if (hasSpecialCharInTitle({ title: newDirectoryName, isFile: false }))
      throw new BadRequestError(
        `Special characters not allowed when renaming subdirectory. Given name: ${newDirectoryName}`
      )
    const parsedNewName = deslugifyCollectionName(newDirectoryName)
    const dir = `_${collectionName}/${subcollectionName}`
    const files = await this.baseDirectoryService.list(sessionData, {
      directoryName: dir,
    })
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of files) {
      if (file.type !== "file") continue
      const fileName = file.name
      if (fileName === PLACEHOLDER_FILE_NAME) {
        await this.gitHubService.delete(sessionData, {
          sha: file.sha,
          fileName,
          directoryName: dir,
        })
        continue
      }
      await this.subcollectionPageService.updateSubcollection(sessionData, {
        fileName,
        collectionName,
        oldSubcollectionName: subcollectionName,
        newSubcollectionName: parsedNewName,
      })
    }
    await this.gitHubService.create(sessionData, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName: `_${collectionName}/${parsedNewName}`,
    })
    await this.collectionYmlService.renameSubfolderInOrder(sessionData, {
      collectionName,
      oldSubfolder: subcollectionName,
      newSubfolder: parsedNewName,
    })
  }

  async deleteDirectory(
    sessionData,
    githubSessionData,
    { collectionName, subcollectionName }
  ) {
    const dir = `_${collectionName}/${subcollectionName}`
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: dir,
      message: `Deleting subcollection ${collectionName}/${subcollectionName}`,
    })
    await this.collectionYmlService.deleteSubfolderFromOrder(sessionData, {
      collectionName,
      subfolder: subcollectionName,
    })
  }

  async reorderDirectory(
    sessionData,
    { collectionName, subcollectionName, objArray }
  ) {
    const newSubcollectionOrder = [`${subcollectionName}/.keep`].concat(
      objArray.map((obj) => `${subcollectionName}/${obj.name}`)
    )
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })
    const insertPos = files.findIndex((fileName) =>
      fileName.includes(`${subcollectionName}/`)
    )
    // We do this step separately to account for subcollections which may not have the .keep file
    const filteredFiles = files.filter(
      (fileName) => !fileName.includes(`${subcollectionName}/`)
    )
    filteredFiles.splice(insertPos, 0, ...newSubcollectionOrder)

    await this.collectionYmlService.updateOrder(sessionData, {
      collectionName,
      newOrder: filteredFiles,
    })
    return objArray
  }

  async movePages(
    sessionData,
    {
      collectionName,
      subcollectionName,
      targetCollectionName,
      targetSubcollectionName,
      objArray,
    }
  ) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of objArray) {
      const fileName = file.name
      await this.moverService.movePage(sessionData, {
        fileName,
        oldFileCollection: collectionName,
        oldFileSubcollection: subcollectionName,
        newFileCollection: targetCollectionName,
        newFileSubcollection: targetSubcollectionName,
      })
    }
  }
}

module.exports = { SubcollectionDirectoryService }
