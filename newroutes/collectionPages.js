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

  const { siteName, collectionName, pageName: encodedPageName } = req.params
  const { content: pageContent } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  let thirdNavTitle
  let parsedPageName = pageName
  if (pageName.includes("/"))
    [thirdNavTitle, parsedPageName] = pageName.split("/")
  await CollectionController.CreatePage(
    { siteName, accessToken },
    {
      fileName: parsedPageName,
      collectionName,
      content: pageContent,
      thirdNavTitle,
    }
  )

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const pageName = decodeURIComponent(encodedPageName)
  let thirdNavTitle
  let parsedPageName = pageName
  if (pageName.includes("/"))
    [thirdNavTitle, parsedPageName] = pageName.split("/")
  const { sha, content } = await CollectionController.ReadPage(
    { siteName, accessToken },
    { fileName: parsedPageName, collectionName, thirdNavTitle }
  )

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  let thirdNavTitle
  let parsedPageName = pageName
  if (pageName.includes("/"))
    [thirdNavTitle, parsedPageName] = pageName.split("/")
  const { newSha } = await CollectionController.UpdatePage(
    { siteName, accessToken },
    {
      fileName: parsedPageName,
      collectionName,
      thirdNavTitle,
      content: pageContent,
      sha,
    }
  )

  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
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

module.exports = router
