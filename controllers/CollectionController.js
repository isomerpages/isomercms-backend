const Bluebird = require("bluebird")

const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const GitHubService = require("@services/db/GitHubService")
const BaseDirectoryService = require("@services/directoryServices/BaseDirectoryService")
const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const NavYmlService = require("@services/fileServices/YmlFileServices/NavYmlService")
const MoverService = require("@services/MoverService")

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]
const ISOMER_TEMPLATE_PROTECTED_DIRS = [
  "data",
  "includes",
  "site",
  "layouts",
  "files",
  "images",
  "misc",
  "pages",
]

const PLACEHOLDER_FILE_NAME = ".keep"

const ListAllCollections = async (reqDetails) => {
  const filesOrDirs = await BaseDirectoryService.List(reqDetails, {
    directoryName: "",
  })
  return filesOrDirs.reduce((acc, curr) => {
    if (
      curr.type === "dir" &&
      !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
      curr.name.slice(0, 1) === "_"
    )
      acc.push(curr.path.slice(1))
    return acc
  }, [])
}

const ListFiles = async (reqDetails, { collectionName, thirdNavTitle }) => {
  if (thirdNavTitle) {
    const files = await BaseDirectoryService.List(reqDetails, {
      directoryName: `_${collectionName}/${thirdNavTitle}`,
    })
    return files.filter((file) => file.name !== PLACEHOLDER_FILE_NAME)
  }
  return CollectionYmlService.ListContents(reqDetails, {
    collectionName,
  })
}

const ListAllCollectionContent = async (reqDetails) => {
  const collections = await ListAllCollections(reqDetails)
  const allCollectionContent = {}
  await Bluebird.map(collections, async (collectionName) => {
    const content = await ListFiles(reqDetails, { collectionName })
    allCollectionContent[collectionName] = content
  })
  return allCollectionContent
}

const CreateCollection = async (reqDetails, { collectionName, orderArray }) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
    throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
  await CollectionYmlService.Create(reqDetails, {
    collectionName,
  })
  if (orderArray) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of orderArray) {
      const [fileName, oldFileCollection, oldFileThirdNav] = file
        .split("/")
        .reverse()
      await MoverService.MovePage(reqDetails, {
        fileName,
        oldFileCollection,
        oldFileThirdNav,
        newFileCollection: collectionName,
      })
    }
  }
}

const RenameCollection = async (
  reqDetails,
  { oldCollectionName, newCollectionName }
) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(newCollectionName))
    throw new ConflictError(protectedFolderConflictErrorMsg(newCollectionName))
  await BaseDirectoryService.Rename(reqDetails, {
    oldDirectoryName: `_${oldCollectionName}`,
    newDirectoryName: `_${newCollectionName}`,
    message: `Renaming collection ${oldCollectionName} to ${newCollectionName}`,
  })
  await CollectionYmlService.RenameCollectionInOrder(reqDetails, {
    oldCollectionName,
    newCollectionName,
  })
  await NavYmlService.RenameCollectionInNav(reqDetails, {
    oldCollectionName,
    newCollectionName,
  })
}

const DeleteCollection = async (reqDetails, { collectionName }) => {
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: `_${collectionName}`,
    message: `Deleting collection ${collectionName}`,
  })
  await NavYmlService.DeleteCollectionInNav(reqDetails, {
    collectionName,
  })
}

const CreateSubcollection = async (
  reqDetails,
  { collectionName, thirdNavTitle, orderArray }
) => {
  const parsedDir = `_${collectionName}/${thirdNavTitle}`
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: parsedDir,
  })

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: `${thirdNavTitle}/${PLACEHOLDER_FILE_NAME}`,
  })

  if (orderArray) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of orderArray) {
      const [fileName, oldFileCollection, oldFileThirdNav] = file
        .split("/")
        .reverse()
      await MoverService.MovePage(reqDetails, {
        fileName,
        oldFileCollection,
        oldFileThirdNav,
        newFileCollection: collectionName,
        newFileThirdNav: thirdNavTitle,
      })
    }
  }
}

const RenameSubcollection = async (
  reqDetails,
  { collectionName, oldThirdNavTitle, newThirdNavTitle }
) => {
  const thirdNavFiles = await ListFiles(reqDetails, {
    collectionName,
    thirdNavTitle: oldThirdNavTitle,
  })

  // We can't perform these operations concurrently because of conflict issues
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const file of thirdNavFiles) {
    await MoverService.MovePage(reqDetails, {
      fileName: file.name,
      oldFileCollection: collectionName,
      oldFileThirdNav: oldThirdNavTitle,
      newFileCollection: collectionName,
      newFileThirdNav: newThirdNavTitle,
    })
  }

  const { sha } = await GitHubService.Read(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${oldThirdNavTitle}`,
  })
  await GitHubService.Delete(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${oldThirdNavTitle}`,
    sha,
  })
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${newThirdNavTitle}`,
  })

  await CollectionYmlService.RenameSubfolderInOrder(reqDetails, {
    collectionName,
    oldSubfolder: oldThirdNavTitle,
    newSubfolder: newThirdNavTitle,
  })
}

const DeleteSubcollection = async (
  reqDetails,
  { collectionName, thirdNavTitle }
) => {
  const dir = `_${collectionName}/${thirdNavTitle}`
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: dir,
    message: `Deleting third nav folder ${thirdNavTitle}`,
  })
  await CollectionYmlService.DeleteSubfolderFromOrder(reqDetails, {
    collectionName,
    subfolder: thirdNavTitle,
  })
}

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

const MovePages = async (
  reqDetails,
  {
    files,
    oldFileCollection,
    oldFileThirdNav,
    newFileCollection,
    newFileThirdNav,
  }
) => {
  for (const fileName of files) {
    await MoverService.MovePage(reqDetails, {
      fileName,
      oldFileCollection,
      oldFileThirdNav,
      newFileCollection,
      newFileThirdNav,
    })
  }
}

module.exports = {
  ListAllCollections,
  ListFiles,
  ListAllCollectionContent,
  CreateCollection,
  RenameCollection,
  DeleteCollection,
  CreateSubcollection,
  RenameSubcollection,
  DeleteSubcollection,
  CreatePage,
  ReadPage,
  UpdatePage,
  DeletePage,
  MovePages,
}
