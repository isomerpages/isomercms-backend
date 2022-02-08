const autoBind = require("auto-bind")
const express = require("express")

class AuthMiddleware {
  constructor({ authMiddlewareService }) {
    this.authMiddlewareService = authMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  noVerify(req, res, next) {
    next("router")
  }

  // Create new page in collection
  verifyJwt(req, res, next) {
    const { cookies, url } = req
    const { accessToken, userId } = this.authMiddlewareService.verifyJwt({
      cookies,
      url,
    })
    req.accessToken = accessToken
    req.userId = userId
    return next("router")
  }

  whoamiAuth(req, res, next) {
    const { cookies, url } = req
    const { accessToken, userId } = this.authMiddlewareService.whoamiAuth({
      cookies,
      url,
    })
    req.accessToken = accessToken
    if (userId) req.userId = userId
    return next("router")
  }

  getRouter() {
    const auth = express.Router()

    // Health check
    auth.get("/v2/ping", this.noVerify)

    // Login and logout
    auth.get("/v1/auth/github-redirect", this.noVerify)
    auth.get("/v1/auth", this.noVerify)
    auth.delete("/v1/auth/logout", this.noVerify)
    auth.get("/v1/auth/whoami", this.whoamiAuth)

    // Index
    auth.get("/v1", this.noVerify)

    // Homepage
    auth.get("/v1/sites/:siteName/homepage", this.verifyJwt)
    auth.post("/v1/sites/:siteName/homepage", this.verifyJwt)

    // Directory
    auth.get("/v1/sites/:siteName/files/:path", this.verifyJwt)

    // Folder pages
    auth.get("/v1/sites/:siteName/folders/all", this.verifyJwt)
    auth.delete(
      "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName",
      this.verifyJwt
    )

    // Collection pages
    auth.get("/v1/sites/:siteName/collections/:collectionName", this.verifyJwt)
    auth.get(
      "/v1/sites/:siteName/collections/:collectionName/pages",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/collections/:collectionName/pages",
      this.verifyJwt
    ) // to remove
    auth.post(
      "/v1/sites/:siteName/collections/:collectionName/pages/new/:pageName",
      this.verifyJwt
    )
    auth.get(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.delete(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
      this.verifyJwt
    )

    // Collections
    auth.get("/v1/sites/:siteName/collections", this.verifyJwt)
    auth.post("/v1/sites/:siteName/collections", this.verifyJwt)
    auth.delete(
      "/v1/sites/:siteName/collections/:collectionName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/collections/:collectionName/rename/:newCollectionName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/collections/:collectionPath/move/:targetPath",
      this.verifyJwt
    )

    // Documents
    auth.get("/v1/sites/:siteName/documents", this.verifyJwt)
    auth.post("/v1/sites/:siteName/documents", this.verifyJwt)
    auth.get("/v1/sites/:siteName/documents/:documentName", this.verifyJwt)
    auth.post("/v1/sites/:siteName/documents/:documentName", this.verifyJwt)
    auth.delete("/v1/sites/:siteName/documents/:documentName", this.verifyJwt)
    auth.post(
      "/v1/sites/:siteName/documents/:documentName/rename/:newDocumentName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/documents/:documentName/move/:newDocumentName",
      this.verifyJwt
    )

    // Images
    auth.get("/v1/sites/:siteName/images", this.verifyJwt)
    auth.post("/v1/sites/:siteName/images", this.verifyJwt)
    auth.get("/v1/sites/:siteName/images/:imageName", this.verifyJwt)
    auth.post("/v1/sites/:siteName/images/:imageName", this.verifyJwt)
    auth.delete("/v1/sites/:siteName/images/:imageName", this.verifyJwt)
    auth.post(
      "/v1/sites/:siteName/images/:imageName/rename/:newImageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/images/:imageName/move/:newImageName",
      this.verifyJwt
    )

    // Media subfolders
    auth.post(
      "/v1/sites/:siteName/media/:mediaType/:folderPath",
      this.verifyJwt
    )
    auth.delete(
      "/v1/sites/:siteName/media/:mediaType/:folderPath",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/media/:mediaType/:oldFolderPath/rename/:newFolderPath",
      this.verifyJwt
    )

    // Menu directory
    auth.get("/v1/sites/:siteName/tree", this.verifyJwt)

    // Menu
    auth.get("/v1/sites/:siteName/menus", this.verifyJwt)
    auth.get("/v1/sites/:siteName/menus/:menuName", this.verifyJwt)
    auth.post("/v1/sites/:siteName/menus/:menuName", this.verifyJwt)

    // Pages
    auth.get("/v1/sites/:siteName/pages", this.verifyJwt)
    auth.post("/v1/sites/:siteName/pages", this.verifyJwt) // to remove
    auth.post("/v1/sites/:siteName/pages/new/:pageName", this.verifyJwt)
    auth.get("/v1/sites/:siteName/pages/:pageName", this.verifyJwt)
    auth.post("/v1/sites/:siteName/pages/:pageName", this.verifyJwt)
    auth.delete("/v1/sites/:siteName/pages/:pageName", this.verifyJwt)
    auth.post(
      "/v1/sites/:siteName/pages/:pageName/rename/:newPageName",
      this.verifyJwt
    )
    auth.post("/v1/sites/:siteName/pages/move/:newPagePath", this.verifyJwt)

    // Resource pages
    auth.get("/v1/sites/:siteName/resources/:resourceName", this.verifyJwt)
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/pages",
      this.verifyJwt
    )
    auth.get(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/pages/new/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
      this.verifyJwt
    )
    auth.delete(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName",
      this.verifyJwt
    )

    // Resource room
    auth.get("/v1/sites/:siteName/resource-room", this.verifyJwt)
    auth.post("/v1/sites/:siteName/resource-room", this.verifyJwt)
    auth.post("/v1/sites/:siteName/resource-room/:resourceRoom", this.verifyJwt)
    auth.delete("/v1/sites/:siteName/resource-room", this.verifyJwt)

    // Resources
    auth.get("/v1/sites/:siteName/resources", this.verifyJwt)
    auth.post("/v1/sites/:siteName/resources", this.verifyJwt)
    auth.delete("/v1/sites/:siteName/resources/:resourceName", this.verifyJwt)
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/rename/:newResourceName",
      this.verifyJwt
    )
    auth.post(
      "/v1/sites/:siteName/resources/:resourceName/move/:newResourceName",
      this.verifyJwt
    )

    // Settings
    auth.get("/v1/sites/:siteName/settings", this.verifyJwt)
    auth.post("/v1/sites/:siteName/settings", this.verifyJwt)

    // New settings
    auth.get("/v2/sites/:siteName/settings", this.verifyJwt)
    auth.post("/v2/sites/:siteName/settings", this.verifyJwt)

    // Navigation
    auth.get("/v1/sites/:siteName/navigation", this.verifyJwt)
    auth.post("/v1/sites/:siteName/navigation", this.verifyJwt)

    // Netlify toml
    auth.get("/v1/sites/:siteName/netlify-toml", this.verifyJwt)

    // Sites
    auth.get("/v1/sites", this.verifyJwt)
    auth.get("/v1/sites/:siteName", this.verifyJwt)
    auth.get("/v1/sites/:siteName/lastUpdated", this.verifyJwt)
    auth.get("/v1/sites/:siteName/stagingUrl", this.verifyJwt)

    // V2 Endpoints

    // Login and logout
    auth.get("/v2/auth/github-redirect", this.noVerify)
    auth.get("/v2/auth", this.noVerify)
    auth.delete("/v2/auth/logout", this.noVerify)
    auth.get("/v2/auth/whoami", this.whoamiAuth)

    // Unlinked pages
    auth.get("/v2/sites/:siteName/pages", this.verifyJwt)
    auth.post("/v2/sites/:siteName/pages/pages", this.verifyJwt)
    auth.get("/v2/sites/:siteName/pages/pages/:pageName", this.verifyJwt)
    auth.post("/v2/sites/:siteName/pages/pages/:pageName", this.verifyJwt)
    auth.delete("/v2/sites/:siteName/pages/pages/:pageName", this.verifyJwt)
    auth.post("/v2/sites/:siteName/pages/move", this.verifyJwt)

    // Collection pages
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/pages",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
      this.verifyJwt
    )
    auth.get(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.get(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      this.verifyJwt
    )

    // Resource Pages
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages",
      this.verifyJwt
    )
    auth.get(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName",
      this.verifyJwt
    )

    // Collections
    auth.get("/v2/sites/:siteName/collections", this.verifyJwt)
    auth.get("/v2/sites/:siteName/collections/:collectionName", this.verifyJwt)
    auth.get(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName",
      this.verifyJwt
    )
    auth.post("/v2/sites/:siteName/collections", this.verifyJwt)
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections",
      this.verifyJwt
    )
    auth.post("/v2/sites/:siteName/collections/:collectionName", this.verifyJwt)
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/collections/:collectionName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/reorder",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/reorder",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/move",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/move",
      this.verifyJwt
    )

    // Resource Room
    auth.get("/v2/sites/:siteName/resourceRoom", this.verifyJwt)
    auth.post("/v2/sites/:siteName/resourceRoom", this.verifyJwt)
    auth.get(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName",
      this.verifyJwt
    )

    // Resource Categories
    auth.get(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/move",
      this.verifyJwt
    )

    // Media directories
    auth.get("/v2/sites/:siteName/media/:directoryName", this.verifyJwt)
    auth.post("/v2/sites/:siteName/media", this.verifyJwt)
    auth.post("/v2/sites/:siteName/media/:directoryName", this.verifyJwt)
    auth.delete("/v2/sites/:siteName/media/:directoryName", this.verifyJwt)
    auth.post("/v2/sites/:siteName/media/:directoryName/move", this.verifyJwt)

    // Media files
    auth.post("/v2/sites/:siteName/media/:directoryName/pages", this.verifyJwt)
    auth.get(
      "/v2/sites/:siteName/media/:directoryName/pages/:fileName",
      this.verifyJwt
    )
    auth.post(
      "/v2/sites/:siteName/media/:directoryName/pages/:fileName",
      this.verifyJwt
    )
    auth.delete(
      "/v2/sites/:siteName/media/:directoryName/pages/:fileName",
      this.verifyJwt
    )

    auth.use((req, res, next) => {
      if (!req.route) {
        return res.status(404).send("Unauthorised for unknown route")
      }
      return next()
    })
    return auth
  }
}

module.exports = { AuthMiddleware }
