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
    sessionData,
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
      } = await this.subcollectionPageService.read(sessionData, {
        fileName,
        collectionName: oldFileCollection,
        subcollectionName: oldFileSubcollection,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.subcollectionPageService.delete(sessionData, {
        fileName,
        collectionName: oldFileCollection,
        subcollectionName: oldFileSubcollection,
        sha,
      })
    } else if (oldFileCollection) {
      const {
        content: { frontMatter, pageBody },
        sha,
      } = await this.collectionPageService.read(sessionData, {
        fileName,
        collectionName: oldFileCollection,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.collectionPageService.delete(sessionData, {
        fileName,
        collectionName: oldFileCollection,
        sha,
      })
    } else {
      const {
        content: { frontMatter, pageBody },
        sha,
      } = await this.unlinkedPageService.read(sessionData, {
        fileName,
      })
      fileFrontMatter = frontMatter
      fileBody = pageBody
      await this.unlinkedPageService.delete(sessionData, { fileName, sha })
    }

    let createResp
    if (newFileSubcollection) {
      createResp = await this.subcollectionPageService.create(sessionData, {
        fileName,
        collectionName: newFileCollection,
        subcollectionName: newFileSubcollection,
        content: fileBody,
        frontMatter: fileFrontMatter,
        shouldIgnoreCheck: true,
      })
    } else if (newFileCollection) {
      createResp = await this.collectionPageService.create(sessionData, {
        fileName,
        collectionName: newFileCollection,
        content: fileBody,
        frontMatter: fileFrontMatter,
        shouldIgnoreCheck: true,
      })
    } else {
      createResp = await this.unlinkedPageService.create(sessionData, {
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
