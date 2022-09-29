const UNLINKED_PAGE_DIRECTORY_NAME = "pages"

class UnlinkedPagesDirectoryService {
  constructor({ baseDirectoryService, moverService }) {
    this.baseDirectoryService = baseDirectoryService
    this.moverService = moverService
  }

  async listAllUnlinkedPages(sessionData) {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
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
    sessionData,
    { targetCollectionName, targetSubcollectionName, objArray }
  ) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of objArray) {
      const fileName = file.name
      await this.moverService.movePage(sessionData, {
        fileName,
        newFileCollection: targetCollectionName,
        newFileSubcollection: targetSubcollectionName,
      })
    }
  }
}

module.exports = { UnlinkedPagesDirectoryService }
