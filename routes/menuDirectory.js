// A route to show the tree structure of the pages and collections directory
const express = require("express")

const router = express.Router()

// Import middleware
const { attachReadRouteHandlerWrapper } = require("../middleware/routeHandler")

// Import classes
const { Tree } = require("../classes/Tree.js")

// Read tree of directory
async function readTree(req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerTreeMenu = new Tree(accessToken, siteName)
  await IsomerTreeMenu.getLinkedPages()
  await IsomerTreeMenu.getUnlinkedPages()

  const response = {
    directory: IsomerTreeMenu.directory,
    unlinked: IsomerTreeMenu.unlinked,
  }

  res.status(200).json(response)
}
router.get("/:siteName/tree", attachReadRouteHandlerWrapper(readTree))

module.exports = router
