const express = require("express")
const yaml = require("yaml")

const router = express.Router()

// Import middleware
<<<<<<< HEAD
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("../middleware/routeHandler")

// Import Classes
const { File, DataType } = require("../classes/File.js")
=======
const { attachReadRouteHandlerWrapper, attachWriteRouteHandlerWrapper } = require('@middleware/routeHandler')

// Import Classes
const { File, DataType } = require('@classes/File.js')
>>>>>>> refactor: replace imports with aliases for Routes

const NAVIGATION_PATH = "navigation.yml"

async function getNavigation(req, res) {
  const { accessToken } = req

  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const dataType = new DataType()
  IsomerFile.setFileType(dataType)
  const { content, sha } = await IsomerFile.read(NAVIGATION_PATH)

  return res.status(200).json({
    sha,
    content: yaml.parse(Base64.decode(content)),
  })
}

async function updateNavigation(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const { content, sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const dataType = new DataType()
  IsomerFile.setFileType(dataType)
  await IsomerFile.update(
    NAVIGATION_PATH,
    Base64.encode(yaml.stringify(content)),
    sha
  )

  return res.status(200).send("OK")
}

router.get(
  "/:siteName/navigation",
  attachReadRouteHandlerWrapper(getNavigation)
)
router.post(
  "/:siteName/navigation",
  attachWriteRouteHandlerWrapper(updateNavigation)
)

module.exports = router
