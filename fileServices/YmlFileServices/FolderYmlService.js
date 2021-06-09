const YmlFileService = require('./YmlFileService')

const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const genFolderUrl = (pageName, collectionName, siteName) => {
    return genGhContentUrl(siteName, `_${collectionName}/${pageName}`)
}

const Read = async ({ pageName, collectionName }, reqDetails) => {
    const path = genFolderUrl(pageName, collectionName, reqDetails.siteName)
    const { content, sha } = await YmlFileService.Read({ path }, reqDetails)

    // Do folder yml specific stuff, if any

    // for now
    return { content, sha }
}

module.exports = {
    Read,
}