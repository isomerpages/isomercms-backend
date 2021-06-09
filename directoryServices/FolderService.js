const BaseDirectoryService = require('./BaseDirectoryService')
const NavYmlService = require('../fileServices/YmlFileServices/NavYmlService')
const FolderConfigYmlService = require('../fileServices/YmlFileServices/FolderYmlService')


const {
    deslugifyCollectionName,
  } = require("@utils/utils.js")

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

const Rename = async ({ oldCollectionName, newCollectionName }, reqDetails) => {
    const commitMessage = `Rename collection from ${oldCollectionName} to ${newCollectionName}`

    // update nav file
    const { content: navContentObj, sha: navSha } = await NavYmlService.Read(reqDetails)
    const newNavLinks = navContentObj.links.map((link) => {
        if (link.collection === oldCollectionName) {
          return {
            title: deslugifyCollectionName(newCollectionName),
            collection: newCollectionName,
          }
        }
        return link
    })
    const newNavContentObj = {
        ...navContentObj,
        links: newNavLinks,
    }
    await NavYmlService.Update({ fileContent: newNavContentObj, sha: navSha }, reqDetails)

    // update directories
    await BaseDirectoryService.Rename({ oldDirectoryName: `_${oldCollectionName}`, newDirectoryName: `_${newCollectionName}`, message: commitMessage }, reqDetails)

    // update collection config
    const { content: collectionConfigObj, sha: collectionConfigSha } = await FolderConfigYmlService.Read({ collectionName: newCollectionName }, reqDetails)
    const newConfigContentObj = {
        collections: {
          [newCollectionName]: collectionConfigObj.collections[oldCollectionName],
        },
    }
    await FolderConfigYmlService.Update({ collectionName: newCollectionName, fileContent: newConfigContentObj, sha: collectionConfigSha}, reqDetails)
}

module.exports = {
    List,
    Rename,
}