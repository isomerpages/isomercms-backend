const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')

const { getTree, sendTree } = require('../utils/utils.js')

// Import middleware
const { attachReadRouteHandlerWrapper, attachRollbackRouteHandlerWrapper } = require('../middleware/routeHandler')

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

// Delete subfolder
async function deleteSubfolder (req, res, next) {
    const { accessToken, currentCommitSha, treeSha } = req
    const { siteName, folderName, subfolderName } = req.params

    // Delete subfolder
    const commitMessage = `Delete subfolder ${folderName}/${subfolderName}`
    const isRecursive = true
    const gitTree = await getTree(siteName, accessToken, treeSha, isRecursive)
    const baseTreeWithoutFolder = gitTree.filter(item => (
        // keep all root-level items except for tree object of folder whose subfolder is to be deleted
       !item.path.includes('/') && item.path !== `_${folderName}`
    ))
    const folderTreeWithoutSubfolder = gitTree.filter(item => (
        // get all folder items, except for the tree object of the folder itself (note the trailing /)
        item.path.includes(`_${folderName}/`)
    )).filter(item => (
        // exclude all subfolder items, including the tree object of the subfolder
        !item.path.includes(`_${folderName}/${subfolderName}`)
    ))

    const newGitTree = [...baseTreeWithoutFolder, ...folderTreeWithoutSubfolder]
    await sendTree(newGitTree, currentCommitSha, siteName, accessToken, commitMessage)

    // Update collection config
    const collectionConfig = new CollectionConfig(accessToken, siteName, folderName)
    await collectionConfig.deleteSubfolderFromOrder(subfolderName)

    res.status(200).send('Ok')
}

// Rename subfolder
async function renameSubfolder (req, res, next) {
    const { accessToken, currentCommitSha, treeSha } = req
    const { siteName, folderName, subfolderName, newSubfolderName } = req.params

    // Rename subfolder
    const commitMessage = `Rename subfolder ${folderName}/${subfolderName} to ${folderName}/${newSubfolderName}`
    const isRecursive = true
    const gitTree = await getTree(siteName, accessToken, treeSha, isRecursive)
    const baseTreeWithoutFolder = gitTree.filter(item => (
        // keep all root-level items except for tree object of folder whose subfolder is to be deleted
       !item.path.includes('/') && item.path !== `_${folderName}`
    ))
    const folderTreeWithRenamedSubfolder= gitTree.filter(item => (
        // get all folder items
        item.path.includes(`_${folderName}`)
    )).filter(item => (
        // remove tree objects of folder and subfolder to be renamed
        item.path !== `_${folderName}` && item.path !== `_${folderName}/${subfolderName}`
    )).map(item => {
        // rename all subfolder items
        if (item.path.includes(`_${folderName}/${subfolderName}`)) {
            const pathArr = item.path.split('/')
            return {
                ...item,
                path: `_${folderName}/${newSubfolderName}/${pathArr[2]}`,
            }
        }
        return item
    })


    const newGitTree = [...baseTreeWithoutFolder, ...folderTreeWithRenamedSubfolder]
    await sendTree(newGitTree, currentCommitSha, siteName, accessToken, commitMessage)

    // // Update collection config
    const collectionConfig = new CollectionConfig(accessToken, siteName, folderName)
    await collectionConfig.renameSubfolderInOrder(subfolderName, newSubfolderName)

    res.status(200).send('Ok')
}

router.get('/:siteName/folders/all', attachReadRouteHandlerWrapper(listAllFolderContent))
router.delete('/:siteName/folders/:folderName/subfolder/:subfolderName', attachRollbackRouteHandlerWrapper(deleteSubfolder))
router.post('/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName', attachRollbackRouteHandlerWrapper(renameSubfolder))

module.exports = router;