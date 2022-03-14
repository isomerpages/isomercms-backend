const express = require("express")

const router = express.Router()

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { Directory, FolderType } = require("@classes/Directory.js")

const { authMiddleware } = require("@root/newmiddleware/index")

// List pages and directories in folder
async function listDirectoryContent(req, res) {
  const { accessToken } = req
  const { siteName, path } = req.params

  const decodedPath = decodeURIComponent(path)

  const IsomerDirectory = new Directory(accessToken, siteName)
  const folderType = new FolderType(decodedPath)
  IsomerDirectory.setDirType(folderType)
  let directoryContents = []

  // try catch should be removed during refactor
  // .list() should return an empty array instead of throwing error
  try {
    directoryContents = await IsomerDirectory.list()
  } catch (e) {
    // directory does not exist, catch error
    console.log(e)
  }
  return res.status(200).json({ directoryContents })
}

router.use(authMiddleware.verifyJwt)
router.get(
  "/:siteName/files/:path",
  attachReadRouteHandlerWrapper(listDirectoryContent)
)

module.exports = router
