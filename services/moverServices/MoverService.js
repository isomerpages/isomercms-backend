class MoverService {
  constructor({
    unlinkedPageService,
    collectionPageService,
    subcollectionPageService,
  }) {
    this.unlinkedPageService = unlinkedPageService
    this.collectionPageService = collectionPageService
    this.subcollectionPageService = subcollectionPageService
  }

  async movePage(
    reqDetails,
    {
      fileName,
      oldFileCollection,
      oldFileSubcollection,
      newFileCollection,
      newFileSubcollection,
    }
  ) {
    let fileContent
    if (oldFileSubcollection) {
      const { content, sha } = await this.subcollectionPageService.read(
        reqDetails,
        {
          fileName,
          collectionName: oldFileCollection,
          subcollectionTitle: oldFileSubcollection,
        }
      )
      fileContent = content
      await this.subcollectionPageService.delete(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
        subcollectionTitle: oldFileSubcollection,
        sha,
      })
    } else if (oldFileCollection && oldFileCollection !== "pages") {
      const { content, sha } = await this.collectionPageService.read(
        reqDetails,
        {
          fileName,
          collectionName: oldFileCollection,
        }
      )
      fileContent = content
      await this.collectionPageService.delete(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
        sha,
      })
    } else {
      const { content, sha } = await this.unlinkedPageService.read(reqDetails, {
        fileName,
      })
      fileContent = content
      await this.unlinkedPageService.delete(reqDetails, { fileName, sha })
    }

    if (newFileSubcollection) {
      await this.subcollectionPageService.create(reqDetails, {
        fileName,
        collectionName: newFileCollection,
        subcollectionTitle: newFileSubcollection,
        content: fileContent,
      })
    } else if (newFileCollection && newFileCollection !== "pages") {
      await this.collectionPageService.create(reqDetails, {
        fileName,
        collectionName: newFileCollection,
        content: fileContent,
      })
    } else {
      await this.unlinkedPageService.create(reqDetails, {
        fileName,
        content: fileContent,
      })
    }
  }
}

module.exports = {
  MoverService,
}
