import { statsMiddleware } from "@root/middleware/stats"

const express = require("express")

const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const router = express.Router({ mergeParams: true })

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import Classes
const { File, DataType } = require("@classes/File")

const NAVIGATION_PATH = "navigation.yml"

async function getNavigation(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const dataType = new DataType()
  IsomerFile.setFileType(dataType)
  const { content, sha } = await IsomerFile.read(NAVIGATION_PATH)

  return res.status(200).json({
    sha,
    content: sanitizedYamlParse(Base64.decode(content)),
  })
}

async function updateNavigation(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const { content, sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const dataType = new DataType()
  IsomerFile.setFileType(dataType)
  await IsomerFile.update(
    NAVIGATION_PATH,
    Base64.encode(sanitizedYamlStringify(content)),
    sha
  )

  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logV1CallFor("getNavigation"),
  attachReadRouteHandlerWrapper(getNavigation)
)
router.post(
  "/",
  statsMiddleware.logV1CallFor("updateNavigation"),
  attachWriteRouteHandlerWrapper(updateNavigation)
)

module.exports = router
