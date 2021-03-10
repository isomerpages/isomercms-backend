const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')

// Import middleware
const { attachReadRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes
const { CollectionConfig } = require('../classes/Config')
const { Collection } = require('../classes/Collection');

const ISOMER_TEMPLATE_DIRS = ['_data', '_includes', '_site', '_layouts']

// List pages and directories from all folders
async function listAllFolderContent (req, res, next) {
    const { accessToken } = req
    const { siteName } = req.params

    const IsomerCollection = new Collection(accessToken, siteName)
    const allFolders = IsomerCollection.list()

    const allFolderContent = await Bluebird.map(allFolders, async (collectionName) => {
        const config = new CollectionConfig(accessToken, siteName, collectionName)
        const { sha, content } = await config.read()
        return { name: collectionName, sha, content }
    })

    res.status(200).json({ allFolderContent })
}

router.get('/:siteName/folders/all', attachReadRouteHandlerWrapper(listAllFolderContent))

module.exports = router;