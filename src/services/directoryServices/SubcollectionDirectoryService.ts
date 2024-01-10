import { BadRequestError } from "@errors/BadRequestError"

import { deslugifyCollectionName } from "@utils/utils"

import { hasSpecialCharInTitle } from "@validators/validators"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import GitHubService from "@services/db/GitHubService"
import { BaseDirectoryService } from "@services/directoryServices/BaseDirectoryService"
import { SubcollectionPageService } from "@services/fileServices/MdPageServices/SubcollectionPageService"
import { CollectionYmlService } from "@services/fileServices/YmlFileServices/CollectionYmlService"
import { MoverService } from "@services/moverServices/MoverService"

const PLACEHOLDER_FILE_NAME = ".keep"

export class SubcollectionDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private collectionYmlService: CollectionYmlService

  private moverService: MoverService

  private subcollectionPageService: SubcollectionPageService

  private gitHubService: GitHubService

  constructor({
    baseDirectoryService,
    collectionYmlService,
    moverService,
    subcollectionPageService,
    gitHubService,
  }: {
    baseDirectoryService: BaseDirectoryService
    collectionYmlService: CollectionYmlService
    moverService: MoverService
    subcollectionPageService: SubcollectionPageService
    gitHubService: GitHubService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.collectionYmlService = collectionYmlService
    this.moverService = moverService
    this.subcollectionPageService = subcollectionPageService
    this.gitHubService = gitHubService
  }

  async listFiles(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      subcollectionName,
    }: { collectionName: string; subcollectionName: string }
  ): Promise<GitDirectoryItem[]> {
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })
    const subcollectionFiles = files.filter(
      (fileName: string) =>
        fileName.startsWith(`${subcollectionName}/`) &&
        !fileName.includes(PLACEHOLDER_FILE_NAME)
    )

    const subcollectionNameLength = `${subcollectionName}/`.length
    return subcollectionFiles.map((fileName: string) => ({
      name: fileName.substring(subcollectionNameLength),
      type: "file",
    }))
  }

  async createDirectory(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      subcollectionName,
      objArray,
    }: { collectionName: string; subcollectionName: string; objArray: any[] } // Replace 'any[]' with the actual type
  ): Promise<{ newDirectoryName: string; items: any[] }> {
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
      isMedia: false,
    })

    await this.collectionYmlService.addItemToOrder(sessionData, {
      collectionName,
      item: `${parsedSubcollectionName}/${PLACEHOLDER_FILE_NAME}`,
      index: undefined,
    })

    if (objArray) {
      await Promise.all(
        objArray.map(async (file) => {
          const fileName = file.name
          await this.moverService.movePage(sessionData, {
            fileName,
            oldFileCollection: collectionName,
            oldFileSubcollection: undefined,
            newFileCollection: collectionName,
            newFileSubcollection: parsedSubcollectionName,
          })
        })
      )
    }
    return {
      newDirectoryName: parsedSubcollectionName,
      items: objArray || [],
    }
  }

  async renameDirectory(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      subcollectionName,
      newDirectoryName,
    }: {
      collectionName: string
      subcollectionName: string
      newDirectoryName: string
    }
  ): Promise<void> {
    if (hasSpecialCharInTitle({ title: newDirectoryName, isFile: false }))
      throw new BadRequestError(
        `Special characters not allowed when renaming subdirectory. Given name: ${newDirectoryName}`
      )

    const parsedNewName = deslugifyCollectionName(newDirectoryName)
    const dir = `_${collectionName}/${subcollectionName}`
    const files = await this.baseDirectoryService.list(sessionData, {
      directoryName: dir,
    })

    await this.gitHubService.create(sessionData, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName: `_${collectionName}/${parsedNewName}`,
      isMedia: false,
    })

    files
      .filter(
        (file) => file.type === "file" && file.name !== PLACEHOLDER_FILE_NAME
      )
      .forEach(async (file) => {
        await this.subcollectionPageService.updateSubcollection(sessionData, {
          fileName: file.name,
          collectionName,
          oldSubcollectionName: subcollectionName,
          newSubcollectionName: parsedNewName,
        })
      })

    await this.collectionYmlService.renameSubfolderInOrder(sessionData, {
      collectionName,
      oldSubfolder: subcollectionName,
      newSubfolder: parsedNewName,
    })
  }

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      collectionName,
      subcollectionName,
    }: { collectionName: string; subcollectionName: string }
  ): Promise<void> {
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
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      subcollectionName,
      objArray,
    }: { collectionName: string; subcollectionName: string; objArray: any[] } // Replace 'any[]' with the actual type
  ): Promise<any[]> {
    const newSubcollectionOrder = [
      `${subcollectionName}/${PLACEHOLDER_FILE_NAME}`,
    ].concat(
      objArray.map((obj: any) => `${subcollectionName}/${obj.name}`) // Replace 'any' with the actual type
    )
    const files = await this.collectionYmlService.listContents(sessionData, {
      collectionName,
    })
    const insertPos = files.findIndex((fileName: string) =>
      fileName.startsWith(`${subcollectionName}/`)
    )
    const filteredFiles = files.filter(
      (fileName: string) => !fileName.startsWith(`${subcollectionName}/`)
    )
    filteredFiles.splice(insertPos, 0, ...newSubcollectionOrder)

    await this.collectionYmlService.updateOrder(sessionData, {
      collectionName,
      newOrder: filteredFiles,
    })
    return objArray
  }

  async movePages(
    sessionData: UserWithSiteSessionData,
    {
      collectionName,
      subcollectionName,
      targetCollectionName,
      targetSubcollectionName,
      objArray,
    }: {
      collectionName: string
      subcollectionName: string
      targetCollectionName: string
      targetSubcollectionName: string
      objArray: any[] // Replace 'any[]' with the actual type
    }
  ): Promise<void> {
    await Promise.all(
      objArray.map(async (file) => {
        const fileName = file.name
        await this.moverService.movePage(sessionData, {
          fileName,
          oldFileCollection: collectionName,
          oldFileSubcollection: subcollectionName,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    )
  }
}

module.exports = SubcollectionDirectoryService
