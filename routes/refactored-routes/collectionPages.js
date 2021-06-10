import CollectionPagesHandler from "../../classes/route-handlers/CollectionPagesHandler"

const Bluebird = require("bluebird")
const express = require("express")
const _ = require("lodash")
const yaml = require("yaml")

// Import errors
const { NotFoundError } = require("@errors/NotFoundError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const router = express.Router()

// List pages in collection
// TODO unused route, listing done by reading collection.yml in read route instead
async function listCollectionPages(req, res) {

}

// Get details on all pages in a collection
// TODO unused route
async function listCollectionPagesDetails(req, res) {

}

// Create new page in collection
async function createCollectionPage(req, res) {
  const { accessToken } = req

  // pageName currently represented as subfolder/pagename
  const { siteName, collectionName, pageName } = req.params
  const { content: pageContent } = req.body

  const collectionPagesHandler = new CollectionPagesHandler(accessToken, siteName)
  await collectionPagesHandler.create(collectionName, pageName, pageContent)

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// Read collection page
async function readCollectionPage(req, res) {
  const { accessToken } = req
  const { siteName, pageName, collectionName } = req.params

  const collectionPagesHandler = new CollectionPagesHandler(accessToken, siteName)
  const { content, sha } = await collectionPagesHandler.read()

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, collectionName } = req.params
  const { content: pageContent, sha } = req.body

  const collectionPagesHandler = new CollectionPagesHandler(accessToken, siteName)
  const { newSha } = await collectionPagesHandler.update(collectionName, pageName, pageContent, sha)

  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, collectionName } = req.params
  const { sha } = req.body

  const collectionPagesHandler = new CollectionPagesHandler(accessToken, siteName)
  await collectionPagesHandler.delete(collectionName, pageName, sha)

  return res.status(200).send("OK")
}

// Rename page in collection
async function renameCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName,
    collectionName,
    newPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const collectionPagesHandler = new CollectionPagesHandler(accessToken, siteName)
  const { newSha } = await collectionPagesHandler.rename(collectionName, pageName, newPageName, pageContent, sha)

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

router.get(
  "/:siteName/collections/:collectionName",
  attachReadRouteHandlerWrapper(listCollectionPages)
)
router.get(
  "/:siteName/collections/:collectionName/pages",
  attachReadRouteHandlerWrapper(listCollectionPagesDetails)
)
router.post(
  "/:siteName/collections/:collectionName/pages/new/:pageName",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.delete(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renameCollectionPage)
)