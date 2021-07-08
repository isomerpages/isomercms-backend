const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionController = require("@controllers/CollectionController")

// Import utils

const router = express.Router()

// // Create new page in collection
async function createCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, collectionName, subcollectionName } = req.params
  const { newFileName, pageBody, frontMatter } = req.body
  const pageName = decodeURIComponent(newFileName)
  const createResp = await CollectionController.CreatePage(
    { siteName, accessToken },
    {
      fileName: pageName,
      collectionName,
      content: pageBody,
      frontMatter,
      thirdNavTitle: subcollectionName,
    }
  )

  return res.status(200).json(createResp)
}

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    subcollectionName,
  } = req.params
  const pageName = decodeURIComponent(encodedPageName)
  const { sha, content } = await CollectionController.ReadPage(
    { siteName, accessToken },
    { fileName: pageName, collectionName, thirdNavTitle: subcollectionName }
  )

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    subcollectionName,
  } = req.params
  const { frontMatter, pageBody, sha, newFileName } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  const updateResp = await CollectionController.UpdatePage(
    { siteName, accessToken },
    {
      fileName: pageName,
      newFileName,
      collectionName,
      thirdNavTitle: subcollectionName,
      content: pageBody,
      frontMatter,
      sha,
    }
  )

  return res.status(200).json(updateResp)
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  let thirdNavTitle
  let parsedPageName = pageName
  if (pageName.includes("/"))
    [thirdNavTitle, parsedPageName] = pageName.split("/")
  await CollectionController.DeletePage(
    { siteName, accessToken },
    { fileName: parsedPageName, collectionName, thirdNavTitle, sha }
  )

  return res.status(200).send("OK")
}

// Rename page in collection
async function renameCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)
  let thirdNavTitle
  let parsedPageName = pageName
  let parsedNewPageName = newPageName
  if (pageName.includes("/")) {
    const [thirdNav, oldParsedName] = pageName.split("/")
    const [unused, newParsedName] = newPageName.split("/")
    thirdNavTitle = thirdNav
    parsedPageName = oldParsedName
    parsedNewPageName = newParsedName
  }
  const { newSha } = await CollectionController.UpdatePage(
    { siteName, accessToken },
    {
      fileName: parsedPageName,
      newFileName: parsedNewPageName,
      collectionName,
      thirdNavTitle,
      content: pageContent,
      sha,
    }
  )

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

router.post(
  "/:siteName/collections/:collectionName/pages",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
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

module.exports = router
