const express = require("express")

const router = express.Router()

// Import middleware
const { attachReadRouteHandlerWrapper } = require("../middleware/routeHandler")

const { Directory, FolderType } = require("../classes/Directory.js")

// List pages and directories in folder
async function listDirectoryContent(req, res) {
  const { accessToken } = req
  const { siteName, path } = req.params

  const decodedPath = decodeURIComponent(path)

  const IsomerDirectory = new Directory(accessToken, siteName)
  const folderType = new FolderType(decodedPath)
  IsomerDirectory.setDirType(folderType)
  let directoryContents = []
  directoryContents = await IsomerDirectory.list()
  return res.status(200).json({ directoryContents })
}

router.get(
  "/:siteName/files/:path",
  attachReadRouteHandlerWrapper(listDirectoryContent)
)

module.exports = router
