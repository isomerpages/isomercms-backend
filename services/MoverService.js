const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")
const UnlinkedPageService = require("@services/fileServices/MdPageServices/UnlinkedPageService")

const MovePage = async (
  reqDetails,
  {
    fileName,
    oldFileCollection,
    oldFileThirdNav,
    newFileCollection,
    newFileThirdNav,
  }
) => {
  let fileContent
  if (oldFileThirdNav) {
    const { content, sha } = await ThirdNavPageService.Read(reqDetails, {
      fileName,
      collectionName: oldFileCollection,
      thirdNavTitle: oldFileThirdNav,
    })
    fileContent = content
    await ThirdNavPageService.Delete(reqDetails, {
      fileName,
      collectionName: oldFileCollection,
      thirdNavTitle: oldFileThirdNav,
      sha,
    })
  } else if (oldFileCollection && oldFileCollection !== "pages") {
    const { content, sha } = await CollectionPageService.Read(reqDetails, {
      fileName,
      collectionName: oldFileCollection,
    })
    fileContent = content
    await CollectionPageService.Delete(reqDetails, {
      fileName,
      collectionName: oldFileCollection,
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
      collectionName: newFileCollection,
      thirdNavTitle: newFileThirdNav,
      content: fileContent,
    })
  } else if (newFileCollection && newFileCollection !== "pages") {
    await CollectionPageService.Create(reqDetails, {
      fileName,
      collectionName: newFileCollection,
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
