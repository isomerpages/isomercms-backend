const express = require('express');
const router = express.Router();

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { Directory, FolderType } = require('../classes/Directory.js');

// List pages and directories in folder
async function listFolderContent (req, res, next) {
    const { accessToken } = req
    const { siteName } = req.params
    const { path } = req.query // paths begin with _

    const IsomerDirectory = new Directory(accessToken, siteName)
    const folderType = new FolderType(path)
    IsomerDirectory.setDirType(folderType)
    const folderPages = await IsomerDirectory.list()
    res.status(200).json({ folderPages })
}

router.get('/:siteName/folders', attachRouteHandlerWrapper(listFolderContent))

module.exports = router;