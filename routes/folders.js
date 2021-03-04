const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')

// Import middleware
const { attachReadRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes
const { CollectionConfig } = require('../classes/Config')
const { Directory, RootType, FolderType } = require('../classes/Directory');

const ISOMER_TEMPLATE_DIRS = ['_data', '_includes', '_site', '_layouts']

// List pages and directories in folder
async function listFolderContent (req, res, next) {
    const { accessToken } = req
    const { siteName } = req.params
    const { path } = req.query

    const IsomerDirectory = new Directory(accessToken, siteName)
    const folderType = new FolderType(path)
    IsomerDirectory.setDirType(folderType)
    const folderPages = await IsomerDirectory.list()
    res.status(200).json({ folderPages })
}

// List pages and directories from all folders
async function listAllFolderContent (req, res, next) {
    const { accessToken } = req
    const { siteName } = req.params

    const IsomerDirectory = new Directory(accessToken, siteName)
    const folderType = new RootType()
    IsomerDirectory.setDirType(folderType)
    const repoRootContent = await IsomerDirectory.list()

    const allFolders = repoRootContent.reduce((acc, curr) => {
        if (
            curr.type === 'dir'
            && !ISOMER_TEMPLATE_DIRS.includes(curr.name)
            && curr.name.slice(0, 1) === '_'
        ) acc.push(curr.path)
        return acc
    }, [])

    const allFolderContent = await Bluebird.map(allFolders, async (folder) => {
        const collectionName = folder.slice(1)
        const config = new CollectionConfig(accessToken, siteName, collectionName)
        const { sha, content } = await config.read()
        return { name: collectionName, sha, content }
    })

    res.status(200).json({ allFolderContent })
}

router.get('/:siteName/folders', attachReadRouteHandlerWrapper(listFolderContent))
router.get('/:siteName/folders/all', attachReadRouteHandlerWrapper(listAllFolderContent))

module.exports = router;