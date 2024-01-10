import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import { BaseDirectoryService } from "@services/directoryServices/BaseDirectoryService"
import { MoverService } from "@services/moverServices/MoverService"

const UNLINKED_PAGE_DIRECTORY_NAME = "pages"

class UnlinkedPagesDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private moverService: MoverService

  constructor({
    baseDirectoryService,
    moverService,
  }: {
    baseDirectoryService: BaseDirectoryService
    moverService: MoverService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.moverService = moverService
  }

  async listAllUnlinkedPages(
    sessionData: UserWithSiteSessionData
  ): Promise<GitDirectoryItem[]> {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
      directoryName: UNLINKED_PAGE_DIRECTORY_NAME,
    })

    return filesOrDirs.reduce(
      (acc: GitDirectoryItem[], curr: GitDirectoryItem) => {
        if (curr.type === "file") {
          acc.push({
            name: curr.name,
            type: "file",
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

  async movePages(
    sessionData: UserWithSiteSessionData,
    {
      targetCollectionName,
      targetSubcollectionName,
      objArray,
    }: {
      targetCollectionName: string
      targetSubcollectionName: string
      objArray: any[]
    } // Replace 'any[]' with the actual type
  ): Promise<void> {
    await Promise.all(
      objArray.map(async (file) => {
        const fileName = file.name
        await this.moverService.movePage(sessionData, {
          fileName,
          oldFileCollection: undefined,
          oldFileSubcollection: undefined,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    )
  }
}

module.exports = { UnlinkedPagesDirectoryService }
