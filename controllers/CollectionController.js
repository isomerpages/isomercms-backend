const Bluebird = require("bluebird")

const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const GitHubService = require("@services/db/GitHubService")
const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const NavYmlService = require("@services/fileServices/YmlFileServices/NavYmlService")

const PLACEHOLDER_FILE_NAME = ".keep"

const CreatePage = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, content, frontMatter }
) => {
  if (thirdNavTitle)
    return ThirdNavPageService.Create(reqDetails, {
      fileName,
      collectionName,
      thirdNavTitle,
      content,
      frontMatter,
    })
  return CollectionPageService.Create(reqDetails, {
    fileName,
    collectionName,
    content,
    frontMatter,
  })
}

const ReadPage = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle }
) => {
  if (thirdNavTitle)
    return ThirdNavPageService.Read(reqDetails, {
      fileName,
      collectionName,
      thirdNavTitle,
    })
  return CollectionPageService.Read(reqDetails, { fileName, collectionName })
}

const UpdatePage = async (
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
) => {
  if (thirdNavTitle) {
    if (newFileName)
      return ThirdNavPageService.Rename(reqDetails, {
        oldFileName: fileName,
        newFileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
        sha,
      })
    return ThirdNavPageService.Update(reqDetails, {
      fileName,
      collectionName,
      thirdNavTitle,
      content,
      frontMatter,
      sha,
    })
  }
  if (newFileName)
    return CollectionPageService.Rename(reqDetails, {
      oldFileName: fileName,
      newFileName,
      collectionName,
      content,
      frontMatter,
      sha,
    })
  return CollectionPageService.Update(reqDetails, {
    fileName,
    collectionName,
    content,
    frontMatter,
    sha,
  })
}

const DeletePage = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, sha }
) => {
  if (thirdNavTitle)
    return ThirdNavPageService.Delete(reqDetails, {
      fileName,
      collectionName,
      thirdNavTitle,
      sha,
    })
  return CollectionPageService.Delete(reqDetails, {
    fileName,
    collectionName,
    sha,
  })
}

module.exports = {
  CreatePage,
  ReadPage,
  UpdatePage,
  DeletePage,
}
