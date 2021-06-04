const express = require("express")

const router = express.Router()
const toml = require("toml")

// Import middleware
<<<<<<< HEAD
const { attachReadRouteHandlerWrapper } = require("../middleware/routeHandler")

// Import classes
const { NetlifyToml } = require("../classes/NetlifyToml")
=======
const { attachReadRouteHandlerWrapper } = require('@middleware/routeHandler')

// Import classes 
const { NetlifyToml } = require('@classes/NetlifyToml')
>>>>>>> refactor: replace imports with aliases for Routes

// List resources
async function getNetlifyToml(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const netlifyTomlFile = new NetlifyToml(accessToken, siteName)

  const { content } = await netlifyTomlFile.read()

  // Convert to readable form
  const netlifyTomlReadableContent = toml.parse(Base64.decode(content))

  // Headers is an array of objects, specifying a set of access rules for each specified path
  // Under our current assumption, we apply the first set of access rules to all paths
  const netlifyTomlHeaderValues = netlifyTomlReadableContent.headers[0].values

  return res.status(200).json({ netlifyTomlHeaderValues })
}

router.get(
  "/:siteName/netlify-toml",
  attachReadRouteHandlerWrapper(getNetlifyToml)
)

module.exports = router
