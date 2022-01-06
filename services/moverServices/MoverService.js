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
    let fileFrontMatter
    let fileBody
    if (oldFileSubcollection) {
      const {
        content: { frontMatter, pageBody },
        sha,
      } = await this.subcollectionPageService.read(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
        subcollectionName: oldFileSubcollection,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.subcollectionPageService.delete(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
        subcollectionName: oldFileSubcollection,
        sha,
      })
    } else if (oldFileCollection) {
      const {
        content: { frontMatter, pageBody },
        sha,
      } = await this.collectionPageService.read(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.collectionPageService.delete(reqDetails, {
        fileName,
        collectionName: oldFileCollection,
        sha,
      })
    } else {
      const {
        content: { frontMatter, pageBody },
        sha,
      } = await this.unlinkedPageService.read(reqDetails, {
        fileName,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.unlinkedPageService.delete(reqDetails, { fileName, sha })
    }

    let createResp
    if (newFileSubcollection) {
      createResp = await this.subcollectionPageService.create(reqDetails, {
        fileName,
        collectionName: newFileCollection,
        subcollectionName: newFileSubcollection,
        content: fileBody,
        frontMatter: fileFrontMatter,
        shouldIgnoreCheck: true,
      })
    } else if (newFileCollection) {
      createResp = await this.collectionPageService.create(reqDetails, {
        fileName,
        collectionName: newFileCollection,
        content: fileBody,
        frontMatter: fileFrontMatter,
        shouldIgnoreCheck: true,
      })
    } else {
      createResp = await this.unlinkedPageService.create(reqDetails, {
        fileName,
        content: fileBody,
        frontMatter: fileFrontMatter,
        shouldIgnoreCheck: true,
      })
    }
    return createResp
  }
}

module.exports = {
  MoverService,
}
