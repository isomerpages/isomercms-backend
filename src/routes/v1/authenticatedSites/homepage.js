const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { File, HomepageType } = require("@classes/File")

// Constants
const HOMEPAGE_INDEX_PATH = "index.md" // Empty string

// Read homepage index file
async function readHomepage(req, res) {
  const { accessToken } = res.locals

  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const homepageType = new HomepageType()
  IsomerFile.setFileType(homepageType)
  const { sha, content: encodedContent } = await IsomerFile.read(
    HOMEPAGE_INDEX_PATH
  )
  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  return res.status(200).json({ content, sha })
}

// Update homepage index file
async function updateHomepage(req, res) {
  const { accessToken } = res.locals

  const { siteName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate content

  const IsomerFile = new File(accessToken, siteName)
  const homepageType = new HomepageType()
  IsomerFile.setFileType(homepageType)
  const { newSha } = await IsomerFile.update(
    HOMEPAGE_INDEX_PATH,
    Base64.encode(content),
    sha
  )

  return res.status(200).json({ content, sha: newSha })
}

router.get("/", attachReadRouteHandlerWrapper(readHomepage))
router.post("/", attachWriteRouteHandlerWrapper(updateHomepage))

module.exports = router
