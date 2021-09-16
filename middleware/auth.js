// Imports
const express = require("express")

// Import logger
const logger = require("@logger/logger")

// Import errors
const { AuthError } = require("@errors/AuthError")

const jwtUtils = require("@utils/jwt-utils")

const { BadRequestError } = require("@root/errors/BadRequestError")

// Instantiate router object
const auth = express.Router()

const { E2E_TEST_REPO, E2E_TEST_SECRET, E2E_TEST_GH_TOKEN } = process.env
const E2E_TEST_USER = "e2e-test"
const GENERAL_ACCESS_PATHS = ["/v1/sites", "/v1/auth/whoami"]

function noVerify(req, res, next) {
  next("router")
}

function verifyE2E(req) {
  const { isomercmsE2E } = req.cookies
  const urlTokens = req.url.split("/") // urls take the form "/v1/sites/<repo>/<path>""
  let isValidE2E

  if (isomercmsE2E) {
    if (isomercmsE2E !== E2E_TEST_SECRET) throw new AuthError("Bad credentials")

    // Throw an error if accessing a repo other than e2e-test-repo
    // Otherwise, allow access only to paths available to all users
    if (!GENERAL_ACCESS_PATHS.includes(req.url)) {
      if (urlTokens.length >= 3) {
        const repo = urlTokens[3]
        if (repo !== E2E_TEST_REPO)
          throw new AuthError(
            `E2E tests can only access the ${E2E_TEST_REPO} repo`
          )
      } else {
        throw new BadRequestError("Invalid path")
      }
    }

    isValidE2E = true
  }

  return isValidE2E
}

const verifyJwt = (req, res, next) => {
  const { isomercms } = req.cookies
  const isValidE2E = verifyE2E(req)

  if (isValidE2E) {
    req.accessToken = E2E_TEST_GH_TOKEN
    req.userId = E2E_TEST_USER
  } else {
    try {
      const {
        access_token: retrievedToken,
        user_id: retrievedId,
      } = jwtUtils.verifyToken(isomercms)
      req.accessToken = jwtUtils.decryptToken(retrievedToken)
      req.userId = retrievedId
    } catch (err) {
      logger.error("Authentication error")
      if (err.name === "TokenExpiredError") {
        throw new AuthError("JWT token has expired")
      }
      if (err.name === "JsonWebTokenError") {
        throw new AuthError(err.message)
      }
      throw new Error(err)
    }
  }
  return next("router")
}

// Extracts access_token if any, else set access_token to null
const whoamiAuth = (req, res, next) => {
  const isValidE2E = verifyE2E(req)

  if (isValidE2E) {
    req.accessToken = E2E_TEST_GH_TOKEN
    req.userId = E2E_TEST_USER
  } else {
    let retrievedToken
    try {
      const { isomercms } = req.cookies
      const { access_token: verifiedToken } = jwtUtils.verifyToken(isomercms)
      retrievedToken = jwtUtils.decryptToken(verifiedToken)
    } catch (err) {
      retrievedToken = undefined
    } finally {
      req.accessToken = retrievedToken
    }
  }

  return next("router")
}

// Health check
auth.get("/v2/ping", noVerify)

// Login and logout
auth.get("/v1/auth/github-redirect", noVerify)
auth.get("/v1/auth", noVerify)
auth.delete("/v1/auth/logout", noVerify)
auth.get("/v1/auth/whoami", whoamiAuth)

// Index
auth.get("/v1", noVerify)

// Homepage
auth.get("/v1/sites/:siteName/homepage", verifyJwt)
auth.post("/v1/sites/:siteName/homepage", verifyJwt)

// Directory
auth.get("/v1/sites/:siteName/files/:path", verifyJwt)

// Folder pages
auth.get("/v1/sites/:siteName/folders/all", verifyJwt)
auth.delete(
  "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName",
  verifyJwt
)

// Collection pages
auth.get("/v1/sites/:siteName/collections/:collectionName", verifyJwt)
auth.get("/v1/sites/:siteName/collections/:collectionName/pages", verifyJwt)
auth.post("/v1/sites/:siteName/collections/:collectionName/pages", verifyJwt) // to remove
auth.post(
  "/v1/sites/:siteName/collections/:collectionName/pages/new/:pageName",
  verifyJwt
)
auth.get(
  "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.delete(
  "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
  verifyJwt
)

// New collection pages
auth.post("/v2/sites/:siteName/collections/:collectionName/pages", verifyJwt)
auth.post(
  "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
  verifyJwt
)
auth.get(
  "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.get(
  "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
  verifyJwt
)
auth.delete(
  "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
  verifyJwt
)
auth.delete(
  "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
  verifyJwt
)

// Collections
auth.get("/v1/sites/:siteName/collections", verifyJwt)
auth.post("/v1/sites/:siteName/collections", verifyJwt)
auth.delete("/v1/sites/:siteName/collections/:collectionName", verifyJwt)
auth.post(
  "/v1/sites/:siteName/collections/:collectionName/rename/:newCollectionName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/collections/:collectionPath/move/:targetPath",
  verifyJwt
)

// Documents
auth.get("/v1/sites/:siteName/documents", verifyJwt)
auth.post("/v1/sites/:siteName/documents", verifyJwt)
auth.get("/v1/sites/:siteName/documents/:documentName", verifyJwt)
auth.post("/v1/sites/:siteName/documents/:documentName", verifyJwt)
auth.delete("/v1/sites/:siteName/documents/:documentName", verifyJwt)
auth.post(
  "/v1/sites/:siteName/documents/:documentName/rename/:newDocumentName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/documents/:documentName/move/:newDocumentName",
  verifyJwt
)

// Images
auth.get("/v1/sites/:siteName/images", verifyJwt)
auth.post("/v1/sites/:siteName/images", verifyJwt)
auth.get("/v1/sites/:siteName/images/:imageName", verifyJwt)
auth.post("/v1/sites/:siteName/images/:imageName", verifyJwt)
auth.delete("/v1/sites/:siteName/images/:imageName", verifyJwt)
auth.post(
  "/v1/sites/:siteName/images/:imageName/rename/:newImageName",
  verifyJwt
)
auth.post("/v1/sites/:siteName/images/:imageName/move/:newImageName", verifyJwt)

// Media subfolders
auth.post("/v1/sites/:siteName/media/:mediaType/:folderPath", verifyJwt)
auth.delete("/v1/sites/:siteName/media/:mediaType/:folderPath", verifyJwt)
auth.post(
  "/v1/sites/:siteName/media/:mediaType/:oldFolderPath/rename/:newFolderPath",
  verifyJwt
)

// Menu directory
auth.get("/v1/sites/:siteName/tree", verifyJwt)

// Menu
auth.get("/v1/sites/:siteName/menus", verifyJwt)
auth.get("/v1/sites/:siteName/menus/:menuName", verifyJwt)
auth.post("/v1/sites/:siteName/menus/:menuName", verifyJwt)

// Pages
auth.get("/v1/sites/:siteName/pages", verifyJwt)
auth.post("/v1/sites/:siteName/pages", verifyJwt) // to remove
auth.post("/v1/sites/:siteName/pages/new/:pageName", verifyJwt)
auth.get("/v1/sites/:siteName/pages/:pageName", verifyJwt)
auth.post("/v1/sites/:siteName/pages/:pageName", verifyJwt)
auth.delete("/v1/sites/:siteName/pages/:pageName", verifyJwt)
auth.post("/v1/sites/:siteName/pages/:pageName/rename/:newPageName", verifyJwt)
auth.post("/v1/sites/:siteName/pages/move/:newPagePath", verifyJwt)

// Resource pages
auth.get("/v1/sites/:siteName/resources/:resourceName", verifyJwt)
auth.post("/v1/sites/:siteName/resources/:resourceName/pages", verifyJwt)
auth.get(
  "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/resources/:resourceName/pages/new/:pageName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
  verifyJwt
)
auth.delete(
  "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName",
  verifyJwt
)

// Resource room
auth.get("/v1/sites/:siteName/resource-room", verifyJwt)
auth.post("/v1/sites/:siteName/resource-room", verifyJwt)
auth.post("/v1/sites/:siteName/resource-room/:resourceRoom", verifyJwt)
auth.delete("/v1/sites/:siteName/resource-room", verifyJwt)

// Resources
auth.get("/v1/sites/:siteName/resources", verifyJwt)
auth.post("/v1/sites/:siteName/resources", verifyJwt)
auth.delete("/v1/sites/:siteName/resources/:resourceName", verifyJwt)
auth.post(
  "/v1/sites/:siteName/resources/:resourceName/rename/:newResourceName",
  verifyJwt
)
auth.post(
  "/v1/sites/:siteName/resources/:resourceName/move/:newResourceName",
  verifyJwt
)

// Settings
auth.get("/v1/sites/:siteName/settings", verifyJwt)
auth.post("/v1/sites/:siteName/settings", verifyJwt)

// Navigation
auth.get("/v1/sites/:siteName/navigation", verifyJwt)
auth.post("/v1/sites/:siteName/navigation", verifyJwt)

// Netlify toml
auth.get("/v1/sites/:siteName/netlify-toml", verifyJwt)

// Sites
auth.get("/v1/sites", verifyJwt)
auth.get("/v1/sites/:siteName", verifyJwt)
auth.get("/v1/sites/:siteName/lastUpdated", verifyJwt)
auth.get("/v1/sites/:siteName/stagingUrl", verifyJwt)

auth.use((req, res, next) => {
  if (!req.route) {
    return res.status(404).send("Unauthorised for unknown route")
  }
  return next()
})

module.exports = {
  auth,
}
