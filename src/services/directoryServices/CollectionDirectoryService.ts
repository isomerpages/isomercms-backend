import { BadRequestError } from "@errors/BadRequestError"
import {
  ConflictError,
  protectedFolderConflictErrorMsg,
} from "@errors/ConflictError"

import { slugifyCollectionName } from "@utils/utils"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { NavYmlService } from "@root/services/fileServices/YmlFileServices/NavYmlService"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import { BaseDirectoryService } from "@services/directoryServices/BaseDirectoryService"
import { CollectionYmlService } from "@services/fileServices/YmlFileServices/CollectionYmlService"
import { MoverService } from "@services/moverServices/MoverService"

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

export class CollectionDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private navYmlService: NavYmlService

  private collectionYmlService: CollectionYmlService

  private moverService: MoverService

  constructor({
    baseDirectoryService,
    navYmlService,
    collectionYmlService,
    moverService,
  }: {
    baseDirectoryService: BaseDirectoryService
    navYmlService: NavYmlService
    collectionYmlService: CollectionYmlService
    moverService: MoverService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.navYmlService = navYmlService
    this.collectionYmlService = collectionYmlService
    this.moverService = moverService
  }

  convertYmlToObjOrder(fileOrder: string[]): GitDirectoryItem[] {
    let currSubcollectionName = ""
    let currSubcollectionFiles: string[] = []
    const processedFiles: GitDirectoryItem[] = []

    const addSubcollection = () => {
      if (currSubcollectionName !== "") {
        processedFiles.push({
          name: currSubcollectionName,
          type: "dir",
          children: currSubcollectionFiles,
          path: "",
          size: 0,
          addedTime: 0,
        })
        currSubcollectionName = ""
        currSubcollectionFiles = []
      }
    }

    fileOrder.forEach((filePath) => {
      if (filePath.includes("/")) {
        const [subcollectionName, fileName] = filePath.split("/")
        if (subcollectionName !== currSubcollectionName) {
          addSubcollection()
          currSubcollectionName = subcollectionName
        }
        if (fileName !== PLACEHOLDER_FILE_NAME)
          currSubcollectionFiles.push(fileName)
      } else {
        addSubcollection()
        processedFiles.push({
          name: filePath,
          type: "file",
          path: "",
          size: 0,
          addedTime: 0,
        })
      }
    })
    addSubcollection()
    return processedFiles
  }

  convertObjToYmlOrder(objArr: GitDirectoryItem[]): string[] {
    const fileOrder: string[] = []
    objArr.forEach((obj) => {
      if (obj.type === "dir") {
        const subcollectionName = obj.name
        fileOrder.push(`${subcollectionName}/${PLACEHOLDER_FILE_NAME}`)
        obj.children?.forEach((fileName) => {
          fileOrder.push(`${subcollectionName}/${fileName}`)
        })
      } else {
        fileOrder.push(obj.name)
      }
    })
    return fileOrder
  }

  async listAllCollections(
    sessionData: UserWithSiteSessionData
  ): Promise<GitDirectoryItem[]> {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
      directoryName: "",
    })
    return filesOrDirs.reduce(
      (acc: GitDirectoryItem[], curr: GitDirectoryItem) => {
        if (
          curr.type === "dir" &&
          !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
          curr.name.startsWith("_")
        ) {
          acc.push({
            name: curr.name.slice(1),
            type: "dir",
            path: "",
            size: 0,
            addedTime: 0,
          })
        }
        return acc
      },
      []
    )
  }

  async listFiles(
    sessionData: UserWithSiteSessionData,
    { collectionName }: { collectionName: string }
  ): Promise<GitDirectoryItem[]> {
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })
    return this.convertYmlToObjOrder(files)
  }

  async createDirectory(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      objArray,
    }: { collectionName: string; objArray: GitDirectoryItem[] }
  ): Promise<{ newDirectoryName: string; items: GitDirectoryItem[] }> {
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
    if (/[^a-zA-Z0-9- ]/g.test(collectionName)) {
      throw new BadRequestError(
        "Special characters not allowed in collection name"
      )
    }
    const slugifiedCollectionName = slugifyCollectionName(collectionName)
    await this.collectionYmlService.create(sessionData, {
      collectionName: slugifiedCollectionName,
      orderArray: undefined,
    })

    if (objArray) {
      const orderArray = this.convertObjToYmlOrder(objArray)
      orderArray.forEach(async (fileName) => {
        await this.moverService.movePage(sessionData, {
          fileName,
          oldFileCollection: undefined,
          oldFileSubcollection: undefined,
          newFileSubcollection: undefined,
          newFileCollection: slugifiedCollectionName,
        })
      })
    }
    return {
      newDirectoryName: slugifiedCollectionName,
      items: objArray || [],
    }
  }

  async renameDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      collectionName,
      newDirectoryName,
    }: { collectionName: string; newDirectoryName: string }
  ): Promise<void> {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
      throw new BadRequestError(
        "Special characters not allowed in collection name"
      )
    }
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(newDirectoryName))
      throw new ConflictError(protectedFolderConflictErrorMsg(newDirectoryName))

    const slugifiedNewCollectionName = slugifyCollectionName(newDirectoryName)
    await this.baseDirectoryService.rename(sessionData, githubSessionData, {
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

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { collectionName }: { collectionName: string }
  ): Promise<void> {
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))

    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: `_${collectionName}`,
      message: `Deleting collection ${collectionName}`,
    })

    await this.navYmlService.deleteCollectionInNav(sessionData, {
      collectionName,
    })
  }

  async reorderDirectory(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      objArray,
    }: { collectionName: string; objArray: GitDirectoryItem[] }
  ): Promise<GitDirectoryItem[]> {
    const fileOrder = this.convertObjToYmlOrder(objArray)
    await this.collectionYmlService.updateOrder(sessionData, {
      collectionName,
      newOrder: fileOrder,
    })
    return objArray
  }

  async movePages(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      targetCollectionName,
      targetSubcollectionName,
      objArray,
    }: {
      collectionName: string
      targetCollectionName: string
      targetSubcollectionName: string
      objArray: GitDirectoryItem[]
    }
  ): Promise<void> {
    await Promise.all(
      objArray.map(async (file) => {
        const fileName = file.name
        await this.moverService.movePage(sessionData, {
          fileName,
          oldFileCollection: collectionName,
          oldFileSubcollection: undefined,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    )
  }
}

module.exports = { CollectionDirectoryService }
