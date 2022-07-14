const UNLINKED_PAGE_DIRECTORY_NAME = "pages"

class UnlinkedPagesDirectoryService {
  constructor({ baseDirectoryService, moverService }) {
    this.baseDirectoryService = baseDirectoryService
    this.moverService = moverService
  }

  async listAllUnlinkedPages(reqDetails) {
    const filesOrDirs = await this.baseDirectoryService.list(reqDetails, {
      directoryName: UNLINKED_PAGE_DIRECTORY_NAME,
    })
    return filesOrDirs.reduce((acc, curr) => {
      if (curr.type === "file")
        acc.push({
          name: curr.name,
          type: "file",
        })
      return acc
    }, [])
  }

  async movePages(
    reqDetails,
    { targetCollectionName, targetSubcollectionName, objArray }
  ) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of objArray) {
      const fileName = file.name
      await this.moverService.movePage(reqDetails, {
        fileName,
        newFileCollection: targetCollectionName,
        newFileSubcollection: targetSubcollectionName,
      })
    }
  }
}

module.exports = { UnlinkedPagesDirectoryService }
