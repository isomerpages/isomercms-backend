class CollectionController {
  constructor({ collectionPageService, subcollectionPageService }) {
    this.collectionPageService = collectionPageService
    this.subcollectionPageService = subcollectionPageService
  }

  async createPage(
    reqDetails,
    { fileName, collectionName, subcollectionName, content, frontMatter }
  ) {
    if (subcollectionName)
      return this.subcollectionPageService.create(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
      })
    return this.collectionPageService.create(reqDetails, {
      fileName,
      collectionName,
      content,
      frontMatter,
    })
  }

  async readPage(reqDetails, { fileName, collectionName, subcollectionName }) {
    if (subcollectionName)
      return this.subcollectionPageService.read(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
      })
    return this.collectionPageService.read(reqDetails, {
      fileName,
      collectionName,
    })
  }

  async updatePage(
    reqDetails,
    {
      fileName,
      newFileName,
      collectionName,
      subcollectionName,
      content,
      frontMatter,
      sha,
    }
  ) {
    if (subcollectionName) {
      if (newFileName)
        return this.subcollectionPageService.rename(reqDetails, {
          oldFileName: fileName,
          newFileName,
          collectionName,
          subcollectionName,
          content,
          frontMatter,
          sha,
        })
      return this.subcollectionPageService.update(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
    }
    if (newFileName)
      return this.collectionPageService.rename(reqDetails, {
        oldFileName: fileName,
        newFileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
    return this.collectionPageService.update(reqDetails, {
      fileName,
      collectionName,
      content,
      frontMatter,
      sha,
    })
  }

  async deletePage(
    reqDetails,
    { fileName, collectionName, subcollectionName, sha }
  ) {
    if (subcollectionName)
      return this.subcollectionPageService.delete(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        sha,
      })
    return this.collectionPageService.delete(reqDetails, {
      fileName,
      collectionName,
      sha,
    })
  }
}

module.exports = { CollectionController }
