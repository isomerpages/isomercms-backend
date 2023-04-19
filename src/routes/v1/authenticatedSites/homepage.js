import { Versions } from "@constants"

import { statsMiddleware } from "@root/middleware/stats"

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
const { HOMEPAGE_FILENAME } = require("@root/constants")

// Read homepage index file
async function readHomepage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const homepageType = new HomepageType()
  IsomerFile.setFileType(homepageType)
  const { sha, content: encodedContent } = await IsomerFile.read(
    HOMEPAGE_FILENAME
  )
  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  return res.status(200).json({ content, sha })
}

// Update homepage index file
async function updateHomepage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate content

  const IsomerFile = new File(accessToken, siteName)
  const homepageType = new HomepageType()
  IsomerFile.setFileType(homepageType)
  const { newSha } = await IsomerFile.update(
    HOMEPAGE_FILENAME,
    Base64.encode(content),
    sha
  )

  return res.status(200).json({ content, sha: newSha })
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "readHomepage"),
  attachReadRouteHandlerWrapper(readHomepage)
)
router.post(
  "/",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "updateHomepage"),
  attachWriteRouteHandlerWrapper(updateHomepage)
)

module.exports = router
