const YmlFileService = require('./YmlFileService')

const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const genFolderYmlUrl = (collectionName, siteName) => {
    return genGhContentUrl(siteName, `_${collectionName}/collection.yml`)
}

const Read = async ({ collectionName }, reqDetails) => {
    const path = genFolderYmlUrl(collectionName, reqDetails.siteName)
    const { content, sha } = await YmlFileService.Read({ path }, reqDetails)

    // Do folder yml specific stuff, if any

    // for now
    return { content, sha }
}

const Update = async ({ collectionName, fileContent, sha }, reqDetails) => {
    const path = genFolderYmlUrl(collectionName, reqDetails.siteName)

    const { newSha } = await YmlFileService.Update({ fileContent, path, sha }, reqDetails)

    return { newSha }
}

module.exports = {
    Read,
    Update,
}