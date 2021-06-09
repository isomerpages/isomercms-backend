const BaseDirectoryService = require('./BaseDirectoryService')

const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const genFolderUrl = (directoryName, siteName) => {
    return genGhContentUrl(siteName, `_${directoryName}`)
}

const List = async ({ directoryName }, reqDetails) => {
    const path = genFolderUrl(directoryName, reqDetails.siteName)
    const data = await BaseDirectoryService.List({ path }, reqDetails)
    
    return { data }
}

module.exports = {
    List,
}