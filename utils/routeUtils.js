// Import classes
const { File, PageType, CollectionPageType } = require('../classes/File')

const readPageUtilFunc = async (accessToken, siteName, pageName) => {
    const IsomerFile = new File(accessToken, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const fileContents = await IsomerFile.read(pageName)
    return fileContents
}

const readCollectionPageUtilFunc = async (accessToken, siteName, collectionName, pageName) => {
    const IsomerFile = new File(accessToken, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    IsomerFile.setFileType(collectionPageType)
    const fileContents = await IsomerFile.read(pageName)
    return fileContents
}

module.exports = {
    readPageUtilFunc,
    readCollectionPageUtilFunc,
}