const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionController = require("@controllers/CollectionController")

const router = express.Router()

// Create new page in collection
async function createCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, collectionName, subcollectionName } = req.params
  const { newFileName, pageBody, frontMatter } = req.body
  const createResp = await CollectionController.CreatePage(
    { siteName, accessToken },
    {
      fileName: newFileName,
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

  const { siteName, pageName, collectionName, subcollectionName } = req.params
  const { sha, content } = await CollectionController.ReadPage(
    { siteName, accessToken },
    { fileName: pageName, collectionName, thirdNavTitle: subcollectionName }
  )

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, collectionName, subcollectionName } = req.params
  const { frontMatter, pageBody, sha, newFileName } = req.body
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

  const { siteName, pageName, collectionName, subcollectionName } = req.params
  const { sha } = req.body
  await CollectionController.DeletePage(
    { siteName, accessToken },
    {
      fileName: pageName,
      collectionName,
      thirdNavTitle: subcollectionName,
      sha,
    }
  )

  return res.status(200).send("OK")
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
router.delete(
  "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)

module.exports = router
