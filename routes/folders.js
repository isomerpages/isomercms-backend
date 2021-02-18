const express = require('express');
const router = express.Router();

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js');

// Import error
const { BadRequestError } = require('../errors/BadRequestError')

// List pages and directories in folder
async function listFolderContent (req, res, next) {
    const { accessToken } = req
    const { siteName } = req.params
    const { path } = req.query // paths begin with _

    // Validation of path
    const pathArr = path.split('/')
    if (path.slice(0,1) !== '_' || pathArr.length > 2 || (pathArr.length === 2 && pathArr[1].includes('.'))) {
        throw new BadRequestError(`The provided path ${path} is not a valid directory!`)
    }

    const IsomerFile = new File(accessToken, siteName)
    const folderPageType = new CollectionPageType(path.slice(1))
    IsomerFile.setFileType(folderPageType)
    const folderPages = await IsomerFile.listAll()

    if (JSON.stringify(folderPages) == '{}') throw new BadRequestError(`Path ${path} was invalid!`)
    res.status(200).json({ folderPages })
}

router.get('/:siteName/folders', attachRouteHandlerWrapper(listFolderContent))

module.exports = router;