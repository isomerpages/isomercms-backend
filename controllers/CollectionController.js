const Bluebird = require("bluebird")

const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const PLACEHOLDER_FILE_NAME = ".keep"

class CollectionController {
  constructor({ collectionPageService, thirdNavPageService }) {
    this.CollectionPageService = collectionPageService
    this.ThirdNavPageService = thirdNavPageService
  }

  async CreatePage(
    reqDetails,
    { fileName, collectionName, thirdNavTitle, content, frontMatter }
  ) {
    if (thirdNavTitle)
      return this.ThirdNavPageService.Create(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
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

  async ReadPage(reqDetails, { fileName, collectionName, thirdNavTitle }) {
    if (thirdNavTitle)
      return this.ThirdNavPageService.Read(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
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
      thirdNavTitle,
      content,
      frontMatter,
      sha,
    }
  ) {
    if (thirdNavTitle) {
      if (newFileName)
        return this.ThirdNavPageService.Rename(reqDetails, {
          oldFileName: fileName,
          newFileName,
          collectionName,
          thirdNavTitle,
          content,
          frontMatter,
          sha,
        })
      return this.ThirdNavPageService.Update(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
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
    { fileName, collectionName, thirdNavTitle, sha }
  ) {
    if (thirdNavTitle)
      return this.ThirdNavPageService.Delete(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
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
