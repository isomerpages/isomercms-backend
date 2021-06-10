import PagesHandler from "../../classes/route-handlers/PagesHandler"

const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const router = express.Router()

async function listPages(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const pagesHandler = new PagesHandler(accessToken, siteName)
  const simplePages = await pagesHandler.list()

  return res.status(200).json({ pages: simplePages })
}

async function createPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName } = req.params
  const { content: pageContent } = req.body

  const pagesHandler = new PagesHandler(accessToken, siteName)
  await pagesHandler.create(pageName, pageContent)

  return res.status(200).json({ pageName, pageContent })
}

// Read page
async function readPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName } = req.params

  const pagesHandler = new PagesHandler(accessToken, siteName)
  await pagesHandler.create(pageName)
  const { sha, content } = await pagesHandler.read(pageName)

  return res.status(200).json({ pageName, sha, content })
}

// Update page
async function updatePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName } = req.params
  const { content: pageContent, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const pagesHandler = new PagesHandler(accessToken, siteName)
  const { newSha } = await pagesHandler.update(pageName, pageContent, sha)

  return res.status(200).json({ pageName, pageContent, sha: newSha })
}

// Delete page
async function deletePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName } = req.params
  const { sha } = req.body

  const pagesHandler = new PagesHandler(accessToken, siteName)
  await pagesHandler.delete(pageName, sha)

  return res.status(200).send("OK")
}

// Rename page
async function renamePage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName,
    newPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  // TO-DO:
  // Validate pageName and content

  const pagesHandler = new PagesHandler(accessToken, siteName)
  const { sha: newSha } = await pagesHandler.rename(pageName, newPageName, pageContent, sha)

  return res
    .status(200)
    .json({ pageName: newPageName, pageContent, sha: newSha })
}

// Move unlinked pages
async function moveUnlinkedPages(req, res) {
  const { accessToken } = req
  const { siteName, newPagePath } = req.params
  const { files } = req.body


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