const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")
const UnlinkedPageService = require("@services/fileServices/MdPageServices/UnlinkedPageService")

const MovePage = async (
  reqDetails,
  {
    fileName,
    oldFileDirectory,
    oldFileThirdNav,
    newFileDirectory,
    newFileThirdNav,
  }
) => {
  let fileContent
  if (oldFileThirdNav) {
    const { content, sha } = await ThirdNavPageService.Read(reqDetails, {
      fileName,
      collectionName: oldFileDirectory,
      thirdNavTitle: oldFileThirdNav,
    })
    fileContent = content
    await ThirdNavPageService.Delete(reqDetails, {
      fileName,
      collectionName: oldFileDirectory,
      thirdNavTitle: oldFileThirdNav,
      sha,
    })
  } else if (oldFileDirectory && oldFileDirectory !== "pages") {
    const { content, sha } = await CollectionPageService.Read(reqDetails, {
      fileName,
      collectionName: oldFileDirectory,
    })
    fileContent = content
    await CollectionPageService.Delete(reqDetails, {
      fileName,
      collectionName: oldFileDirectory,
      sha,
    })
  } else {
    const { content, sha } = await UnlinkedPageService.Read(reqDetails, {
      fileName,
    })
    fileContent = content
    await UnlinkedPageService.Delete(reqDetails, { fileName, sha })
  }

  if (newFileThirdNav) {
    await ThirdNavPageService.Create(reqDetails, {
      fileName,
      collectionName: newFileDirectory,
      thirdNavTitle: newFileThirdNav,
      content: fileContent,
    })
  } else if (newFileDirectory && newFileDirectory !== "pages") {
    await CollectionPageService.Create(reqDetails, {
      fileName,
      collectionName: newFileDirectory,
      content: fileContent,
    })
  } else {
    await UnlinkedPageService.Create(reqDetails, {
      fileName,
      content: fileContent,
    })
  }
}

module.exports = {
  MovePage,
}
