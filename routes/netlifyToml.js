const express = require("express")
const toml = require("toml")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

// Import classes
const { NetlifyToml } = require("@classes/NetlifyToml")

const { authMiddleware } = require("@root/newmiddleware/index")

const router = express.Router()

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

router.use(authMiddleware.verifyJwt)
router.get(
  "/:siteName/netlify-toml",
  attachReadRouteHandlerWrapper(getNetlifyToml)
)

module.exports = router
