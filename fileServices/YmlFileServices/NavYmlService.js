const YmlFileService = require('./YmlFileService')

const NAV_FILE_NAME = "navigation.yml"

const genGhContentUrl = (siteName, path) => {
    return `${siteName}/contents/${path}`
}

const genNavFileUrl = (siteName) => {
    return genGhContentUrl(siteName, `_data/${NAV_FILE_NAME}`)
}

const Read = async (reqDetails) => {
    const path = genNavFileUrl(reqDetails.siteName)
    const { content, sha } = await YmlFileService.Read({ path }, reqDetails)
    return { content , sha }
}

const Update = async ({ fileContent, sha }, reqDetails) => {
    const path = genNavFileUrl(reqDetails.siteName)

    const { newSha } = await YmlFileService.Update({ fileContent, path, sha }, reqDetails)

    return { newSha }
}

module.exports = {
    Read,
    Update,
}