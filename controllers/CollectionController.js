class CollectionController {
  constructor({ collectionPageService, subcollectionPageService }) {
    this.CollectionPageService = collectionPageService
    this.SubcollectionPageService = subcollectionPageService
  }

  async CreatePage(
    reqDetails,
    { fileName, collectionName, subcollectionName, content, frontMatter }
  ) {
    if (subcollectionName)
      return this.SubcollectionPageService.Create(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
      })
    return this.CollectionPageService.Create(reqDetails, {
      fileName,
      collectionName,
      content,
      frontMatter,
    })
  }

  async ReadPage(reqDetails, { fileName, collectionName, subcollectionName }) {
    if (subcollectionName)
      return this.SubcollectionPageService.Read(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
      })
    return this.CollectionPageService.Read(reqDetails, {
      fileName,
      collectionName,
    })
  }

  async UpdatePage(
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
        return this.SubcollectionPageService.Rename(reqDetails, {
          oldFileName: fileName,
          newFileName,
          collectionName,
          subcollectionName,
          content,
          frontMatter,
          sha,
        })
      return this.SubcollectionPageService.Update(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
    }
    if (newFileName)
      return this.CollectionPageService.Rename(reqDetails, {
        oldFileName: fileName,
        newFileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
    return this.CollectionPageService.Update(reqDetails, {
      fileName,
      collectionName,
      content,
      frontMatter,
      sha,
    })
  }

  async DeletePage(
    reqDetails,
    { fileName, collectionName, subcollectionName, sha }
  ) {
    if (subcollectionName)
      return this.SubcollectionPageService.Delete(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        sha,
      })
    return this.CollectionPageService.Delete(reqDetails, {
      fileName,
      collectionName,
      sha,
    })
  }
}

module.exports = { CollectionController }
