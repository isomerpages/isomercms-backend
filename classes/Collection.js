const yaml = require('yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

const { CollectionConfig } = require('./Config.js')
const { File, CollectionPageType, DataType } = require('./File.js')
const { Directory, RootType } = require('./Directory.js')
const { ConflictError, protectedFolderConflictErrorMsg } = require('../errors/ConflictError')
const { getCommitAndTreeSha, getTree, sendTree, deslugifyCollectionName } = require('../utils/utils.js')

const NAV_FILE_NAME = 'navigation.yml'
const ISOMER_TEMPLATE_DIRS = ['_data', '_includes', '_site', '_layouts']
const ISOMER_TEMPLATE_PROTECTED_DIRS = ['data', 'includes', 'site', 'layouts', 'files', 'images', 'misc', 'pages']

class Collection {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async list() {
    const IsomerDirectory = new Directory(this.accessToken, this.siteName)
    const folderType = new RootType()
    IsomerDirectory.setDirType(folderType)
    const repoRootContent = await IsomerDirectory.list()

    const allFolders = repoRootContent.reduce((acc, curr) => {
        if (
            curr.type === 'dir'
            && !ISOMER_TEMPLATE_DIRS.includes(curr.name)
            && curr.name.slice(0, 1) === '_'
        ) acc.push(curr.path.slice(1))
        return acc
    }, [])
    return allFolders
  }

  async create(collectionName, orderArray) {
    try {
      const collectionConfig = new CollectionConfig(this.accessToken, this.siteName, collectionName)
      const contentObject = {
        collections: {
          [collectionName]: {
            output: true,
            order: orderArray || [],
          },
        }
      }
      if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName)) throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
      const newContent = base64.encode(yaml.stringify(contentObject))
      await collectionConfig.create(newContent)

      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(base64.decode(navContent))

      navContentObject.links.push({ 
        title: deslugifyCollectionName(collectionName),
        collection: collectionName 
      })
      const newNavContent = base64.encode(yaml.stringify(navContentObject))

      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

    } catch (err) {
      throw err
    }
  }

  async delete(collectionName, currentCommitSha, treeSha) {
    try {
      const commitMessage = `Delete collection ${collectionName}`
      const gitTree = await getTree(this.siteName, this.accessToken, treeSha)
      const newGitTree = gitTree.filter(item => {
        if (item.path !== `_${collectionName}`) return item
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage)

      // Delete collection in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(base64.decode(navContent))

      const newNavLinks = navContentObject.links.filter(link => link.collection !== collectionName)
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = base64.encode(yaml.stringify(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)
    } catch (err) {
      throw err
    }
  }

  async rename(oldCollectionName, newCollectionName, currentCommitSha, treeSha) {
    try {
      const commitMessage = `Rename collection from ${oldCollectionName} to ${newCollectionName}`

      // Rename collection in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(base64.decode(navContent))

      const newNavLinks = navContentObject.links.map(link => {
        if (link.collection === oldCollectionName) {
          return {
            title: deslugifyCollectionName(newCollectionName),
            collection: newCollectionName 
          }
        } else {
          return link
        }
      })
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = base64.encode(yaml.stringify(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

      const gitTree = await getTree(this.siteName, this.accessToken, treeSha);
      const oldCollectionDirectoryName = `_${oldCollectionName}`
      const newCollectionDirectoryName = `_${newCollectionName}`
      const newGitTree = gitTree.map(item => {
        if (item.path === oldCollectionDirectoryName) {
          return {
            ...item,
            path: newCollectionDirectoryName
          }
        } else {
          return item
        }
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage);

      // Update collection.yml in newCollection with newCollection name
      const collectionConfig = new CollectionConfig(this.accessToken, this.siteName, newCollectionName)
      const { content: configContentObject, sha: configSha } = await collectionConfig.read()
      const newConfigContentObject = {
        collections: {
          [newCollectionName]: configContentObject.collections[oldCollectionName]
        }
      }
      const newConfigContent = base64.encode(yaml.stringify(newConfigContentObject))
      await collectionConfig.update(newConfigContent, configSha)

    } catch (err) {
      throw err
    }
  }
}

module.exports = { Collection }