const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const UnlinkedPageController = require("@controllers/UnlinkedPageController")

const router = express.Router()

async function listPages(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const simplePages = await UnlinkedPageController.ListUnlinkedPages({
    accessToken,
    siteName,
  })

  return res.status(200).json({ pages: simplePages })
}

async function createPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName } = req.params
  const { content } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  await UnlinkedPageController.CreatePage(
    { accessToken, siteName },
    { fileName: pageName, content }
  )

  return res.status(200).json({ pageName, pageContent: content })
}

// Read page
async function readPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

  const { sha, content } = await UnlinkedPageController.ReadPage(
    { accessToken, siteName },
    { fileName: pageName }
  )

  return res.status(200).json({ pageName, sha, content })
}

// Update page
async function updatePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  const { newSha } = await UnlinkedPageController.UpdatePage(
    { accessToken, siteName },
    { fileName: pageName, content: pageContent, sha }
  )

  return res.status(200).json({ pageName, pageContent, sha: newSha })
}

// Delete page
async function deletePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  await UnlinkedPageController.DeletePage(
    { accessToken, siteName },
    { fileName: pageName, sha }
  )

  return res.status(200).send("OK")
}

// Rename page
async function renamePage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  const { newSha } = await UnlinkedPageController.UpdatePage(
    { accessToken, siteName },
    {
      fileName: pageName,
      newFileName: newPageName,
      content: pageContent,
      sha,
    }
  )

  return res
    .status(200)
    .json({ pageName: newPageName, pageContent, sha: newSha })
}

// Move unlinked pages
async function moveUnlinkedPages(req, res) {
  const { accessToken } = req
  const { siteName, newPagePath } = req.params
  const { files } = req.body
  const processedTargetPathTokens = decodeURIComponent(newPagePath).split("/")
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  await UnlinkedPageController.MovePages(
    { accessToken, siteName },
    {
      files,
      newFileCollection: targetCollectionName,
      newFileThirdNav: targetSubfolderName,
    }
  )

  return res.status(200).send("OK")
}

router.get("/:siteName/pages", attachReadRouteHandlerWrapper(listPages))
router.post(
  "/:siteName/pages/new/:pageName",
  attachWriteRouteHandlerWrapper(createPage)
)
router.get(
  "/:siteName/pages/:pageName",
  attachReadRouteHandlerWrapper(readPage)
)
router.post(
  "/:siteName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updatePage)
)
router.delete(
  "/:siteName/pages/:pageName",
  attachWriteRouteHandlerWrapper(deletePage)
)
router.post(
  "/:siteName/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renamePage)
)
router.post(
  "/:siteName/pages/move/:newPagePath",
  attachRollbackRouteHandlerWrapper(moveUnlinkedPages)
)

module.exports = router
