const MdPageService = require('./MdPageService')

const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const genFolderUrl = (pageName, collectionName, siteName) => {
    return genGhContentUrl(siteName, `_${collectionName}/${pageName}`)
}

const Read = async ({ pageName, collectionName }, reqDetails) => {
    const path = genFolderUrl(pageName, collectionName, reqDetails.siteName)
    const { content, sha } = await MdPageService.Read({ path }, reqDetails)

    // Do folder page-specific stuff, if any

    // for now
    return { content, sha }
}

const Update = async ({ fileContent, pageName, collectionName, sha }, reqDetails) => {
    const path = genFolderUrl(pageName, collectionName, reqDetails.siteName)
    const { sha: newSha } = await MdPageService.Update({ fileContent, path, sha }, reqDetails)

    // Do folder page-specific stuff, if any

    // for now
    return { newSha }
}

module.exports = {
    Read,
    Update,
}