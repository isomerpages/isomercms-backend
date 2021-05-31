const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')
const _ = require('lodash')
const yaml = require('yaml')

// Import middleware
const {   
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper, 
  attachRollbackRouteHandlerWrapper 
} = require('../middleware/routeHandler')

// Import classes
const { File, PageType, CollectionPageType } = require('../classes/File.js')
const { Collection } = require('../classes/Collection.js');
const { CollectionConfig } = require('../classes/Config');
const { Subfolder } = require('../classes/Subfolder');

const { deslugifyCollectionName } = require('../utils/utils')

async function listPages (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const simplePages = await IsomerFile.list()
  
  res.status(200).json({ pages: simplePages })
}

async function createPage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: decodedPageName } = req.params
  const { content: pageContent } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  await IsomerFile.create(decodedPageName, Base64.encode(pageContent))

  res.status(200).json({ decodedPageName, pageContent })
}

// Read page
async function readPage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: decodedPageName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha, content: encodedContent } = await IsomerFile.read(decodedPageName)

  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  res.status(200).json({ decodedPageName, sha, content })
}

// Update page
async function updatePage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: decodedPageName } = req.params
  const { content: pageContent, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { newSha } = await IsomerFile.update(decodedPageName, Base64.encode(pageContent), sha)

  res.status(200).json({ decodedPageName, pageContent, sha: newSha })
}

// Delete page
async function deletePage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: decodedPageName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  await IsomerFile.delete(decodedPageName, sha)

  res.status(200).send('OK')
}

// Rename page
async function renamePage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: decodedPageName, newPageName: decodedNewPageName } = req.params
  const { sha, content: pageContent } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha: newSha } = await IsomerFile.create(decodedPageName, Base64.encode(pageContent))
  await IsomerFile.delete(decodedPageName, sha)

  res.status(200).json({ pageName: decodedPageName, pageContent, sha: newSha })
}

// Move unlinked pages
async function moveUnlinkedPages (req, res, next) {
  const { accessToken } = req
  const { siteName, newPagePath } = req.params
  const { files } = req.body
  const processedTargetPathTokens = newPagePath.split('/')
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  // Check if collection already exists
  if (!collections.includes(targetCollectionName)) {
    await IsomerCollection.create(targetCollectionName)
  }

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldPageType = new PageType()
  const newCollectionPageType = new CollectionPageType(newPagePath)
  oldIsomerFile.setFileType(oldPageType)
  newIsomerFile.setFileType(newCollectionPageType)
  const newConfig = new CollectionConfig(accessToken, siteName, targetCollectionName)

  if (newConfig && targetSubfolderName) {
    // Check if subfolder exists
    const IsomerSubfolder = new Subfolder(accessToken, siteName, targetCollectionName)
    const subfolders = await IsomerSubfolder.list()
    if (!subfolders.includes(targetSubfolderName)) await IsomerSubfolder.create(targetSubfolderName)
  }

  // We can't perform these operations concurrently because of conflict issues
  for (const decodedFileName of files) {
    const { content, sha } = await oldIsomerFile.read(decodedFileName)
    await oldIsomerFile.delete(decodedFileName, sha)
    if (targetSubfolderName) {
      // Adding third nav to front matter, to be removed after template rewrite
      const [ _, encodedFrontMatter, pageContent ] = Base64.decode(content).split('---')
      const frontMatter = yaml.parse(encodedFrontMatter)
      frontMatter.third_nav_title = deslugifyCollectionName(targetSubfolderName)
      const newFrontMatter = yaml.stringify(frontMatter)
      const newContent = ['---\n', newFrontMatter, '---', pageContent].join('')
      const newEncodedContent = Base64.encode(newContent)
      await newIsomerFile.create(decodedFileName, newEncodedContent)
    } else {
      await newIsomerFile.create(decodedFileName, content)
    }
    // Update collection.yml files
    await newConfig.addItemToOrder(`${targetSubfolderName ? `${targetSubfolderName}/` : ''}${decodedFileName}`)
  }

  res.status(200).send('OK')
}


router.get('/:siteName/pages', attachReadRouteHandlerWrapper(listPages))
router.post('/:siteName/pages/new/:pageName', attachWriteRouteHandlerWrapper(createPage))
router.get('/:siteName/pages/:pageName', attachReadRouteHandlerWrapper(readPage))
router.post('/:siteName/pages/:pageName', attachWriteRouteHandlerWrapper(updatePage))
router.delete('/:siteName/pages/:pageName', attachWriteRouteHandlerWrapper(deletePage))
router.post('/:siteName/pages/:pageName/rename/:newPageName', attachRollbackRouteHandlerWrapper(renamePage))
router.post('/:siteName/pages/move/:newPagePath', attachRollbackRouteHandlerWrapper(moveUnlinkedPages))

module.exports = router;