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
    auth.verifiedGet = (path) => {
      auth.get(path, this.verifyJwt)
    }
    auth.verifiedDelete = (path) => {
      auth.delete(path, this.verifyJwt)
    }
    auth.verifiedPost = (path) => {
      auth.post(path, this.verifyJwt)
    }

    // Health check
    auth.get("/v2/ping", this.noVerify)

    // V1 endpoints
    // TODO [#351]: Remove after refactor is done
    // Login and logout
    auth.get("/v1/auth/github-redirect", this.noVerify)
    auth.get("/v1/auth", this.noVerify)
    auth.delete("/v1/auth/logout", this.noVerify)
    auth.get("/v1/auth/whoami", this.whoamiAuth)

    // Index
    auth.get("/v1", this.noVerify)

    // Homepage
    auth.verifiedGet("/v1/sites/:siteName/homepage")
    auth.verifiedPost("/v1/sites/:siteName/homepage")

    // Directory
    auth.verifiedGet("/v1/sites/:siteName/files/:path")

    // Folder pages
    auth.verifiedGet("/v1/sites/:siteName/folders/all")
    auth.verifiedDelete(
      "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName"
    )

    // Collection pages
    auth.verifiedGet("/v1/sites/:siteName/collections/:collectionName")
    auth.verifiedGet("/v1/sites/:siteName/collections/:collectionName/pages")
    auth.verifiedPost("/v1/sites/:siteName/collections/:collectionName/pages")
    auth.verifiedPost(
      "/v1/sites/:siteName/collections/:collectionName/pages/new/:pageName"
    )
    auth.verifiedGet(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedDelete(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName"
    )

    // Collections
    auth.verifiedGet("/v1/sites/:siteName/collections")
    auth.verifiedPost("/v1/sites/:siteName/collections")
    auth.verifiedDelete("/v1/sites/:siteName/collections/:collectionName")
    auth.verifiedPost(
      "/v1/sites/:siteName/collections/:collectionName/rename/:newCollectionName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/collections/:collectionPath/move/:targetPath"
    )

    // Documents
    auth.verifiedGet("/v1/sites/:siteName/documents")
    auth.verifiedPost("/v1/sites/:siteName/documents")
    auth.verifiedGet("/v1/sites/:siteName/documents/:documentName")
    auth.verifiedPost("/v1/sites/:siteName/documents/:documentName")
    auth.verifiedDelete("/v1/sites/:siteName/documents/:documentName")
    auth.verifiedPost(
      "/v1/sites/:siteName/documents/:documentName/rename/:newDocumentName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/documents/:documentName/move/:newDocumentName"
    )

    // Images
    auth.verifiedGet("/v1/sites/:siteName/images")
    auth.verifiedPost("/v1/sites/:siteName/images")
    auth.verifiedGet("/v1/sites/:siteName/images/:imageName")
    auth.verifiedPost("/v1/sites/:siteName/images/:imageName")
    auth.verifiedDelete("/v1/sites/:siteName/images/:imageName")
    auth.verifiedPost(
      "/v1/sites/:siteName/images/:imageName/rename/:newImageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/images/:imageName/move/:newImageName"
    )

    // Media subfolders
    auth.verifiedPost("/v1/sites/:siteName/media/:mediaType/:folderPath")
    auth.verifiedDelete("/v1/sites/:siteName/media/:mediaType/:folderPath")
    auth.verifiedPost(
      "/v1/sites/:siteName/media/:mediaType/:oldFolderPath/rename/:newFolderPath"
    )

    // Menu directory
    auth.verifiedGet("/v1/sites/:siteName/tree")

    // Menu
    auth.verifiedGet("/v1/sites/:siteName/menus")
    auth.verifiedGet("/v1/sites/:siteName/menus/:menuName")
    auth.verifiedPost("/v1/sites/:siteName/menus/:menuName")

    // Pages
    auth.verifiedGet("/v1/sites/:siteName/pages")
    auth.verifiedPost("/v1/sites/:siteName/pages")
    auth.verifiedPost("/v1/sites/:siteName/pages/new/:pageName")
    auth.verifiedGet("/v1/sites/:siteName/pages/:pageName")
    auth.verifiedPost("/v1/sites/:siteName/pages/:pageName")
    auth.verifiedDelete("/v1/sites/:siteName/pages/:pageName")
    auth.verifiedPost("/v1/sites/:siteName/pages/:pageName/rename/:newPageName")
    auth.verifiedPost("/v1/sites/:siteName/pages/move/:newPagePath")

    // Resource pages
    auth.verifiedGet("/v1/sites/:siteName/resources/:resourceName")
    auth.verifiedPost("/v1/sites/:siteName/resources/:resourceName/pages")
    auth.verifiedGet(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/resources/:resourceName/pages/new/:pageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName"
    )
    auth.verifiedDelete(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName"
    )

    // Resource room
    auth.verifiedGet("/v1/sites/:siteName/resource-room")
    auth.verifiedPost("/v1/sites/:siteName/resource-room")
    auth.verifiedPost("/v1/sites/:siteName/resource-room/:resourceRoom")
    auth.verifiedDelete("/v1/sites/:siteName/resource-room")

    // Resources
    auth.verifiedGet("/v1/sites/:siteName/resources")
    auth.verifiedPost("/v1/sites/:siteName/resources")
    auth.verifiedDelete("/v1/sites/:siteName/resources/:resourceName")
    auth.verifiedPost(
      "/v1/sites/:siteName/resources/:resourceName/rename/:newResourceName"
    )
    auth.verifiedPost(
      "/v1/sites/:siteName/resources/:resourceName/move/:newResourceName"
    )

    // Settings
    auth.verifiedGet("/v1/sites/:siteName/settings")
    auth.verifiedPost("/v1/sites/:siteName/settings")

    // New settings
    auth.verifiedGet("/v2/sites/:siteName/settings")
    auth.verifiedPost("/v2/sites/:siteName/settings")

    // Navigation
    auth.verifiedGet("/v1/sites/:siteName/navigation")
    auth.verifiedPost("/v1/sites/:siteName/navigation")

    // Netlify toml
    auth.verifiedGet("/v1/sites/:siteName/netlify-toml")

    // Sites
    auth.verifiedGet("/v1/sites")
    auth.verifiedGet("/v1/sites/:siteName")
    auth.verifiedGet("/v1/sites/:siteName/lastUpdated")
    auth.verifiedGet("/v1/sites/:siteName/stagingUrl")

    // V2 Endpoints

    // Login and logout
    auth.get("/v2/auth/github-redirect", this.noVerify)
    auth.get("/v2/auth", this.noVerify)
    auth.delete("/v2/auth/logout", this.noVerify)
    auth.get("/v2/auth/whoami", this.whoamiAuth)

    // Unlinked pages
    auth.verifiedGet("/v2/sites/:siteName/pages")
    auth.verifiedPost("/v2/sites/:siteName/pages/pages")
    auth.verifiedGet("/v2/sites/:siteName/pages/pages/:pageName")
    auth.verifiedPost("/v2/sites/:siteName/pages/pages/:pageName")
    auth.verifiedDelete("/v2/sites/:siteName/pages/pages/:pageName")
    auth.verifiedPost("/v2/sites/:siteName/pages/move")

    // Collection pages
    auth.verifiedPost("/v2/sites/:siteName/collections/:collectionName/pages")
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages"
    )
    auth.verifiedGet(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedGet(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName"
    )
    auth.verifiedDelete(
      "/v2/sites/:siteName/collections/:collectionName/pages/:pageName"
    )
    auth.verifiedDelete(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName"
    )

    // Resource Pages
    auth.verifiedPost(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages"
    )
    auth.verifiedGet(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName"
    )
    auth.verifiedDelete(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages/:pageName"
    )

    // Collections
    auth.verifiedGet("/v2/sites/:siteName/collections")
    auth.verifiedGet("/v2/sites/:siteName/collections/:collectionName")
    auth.verifiedGet(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName"
    )
    auth.verifiedPost("/v2/sites/:siteName/collections")
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections"
    )
    auth.verifiedPost("/v2/sites/:siteName/collections/:collectionName")
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName"
    )
    auth.verifiedDelete("/v2/sites/:siteName/collections/:collectionName")
    auth.verifiedDelete(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName"
    )
    auth.verifiedPost("/v2/sites/:siteName/collections/:collectionName/reorder")
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/reorder"
    )
    auth.verifiedPost("/v2/sites/:siteName/collections/:collectionName/move")
    auth.verifiedPost(
      "/v2/sites/:siteName/collections/:collectionName/subcollections/:subcollectionName/move"
    )

    // Resource Room
    auth.verifiedGet("/v2/sites/:siteName/resourceRoom")
    auth.verifiedPost("/v2/sites/:siteName/resourceRoom")
    auth.verifiedGet("/v2/sites/:siteName/resourceRoom/:resourceRoomName")
    auth.verifiedPost("/v2/sites/:siteName/resourceRoom/:resourceRoomName")
    auth.verifiedDelete("/v2/sites/:siteName/resourceRoom/:resourceRoomName")

    // Resource Categories
    auth.verifiedGet(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName"
    )
    auth.verifiedDelete(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName"
    )
    auth.verifiedPost(
      "/v2/sites/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/move"
    )

    // Media directories
    auth.verifiedGet("/v2/sites/:siteName/media/:directoryName")
    auth.verifiedPost("/v2/sites/:siteName/media")
    auth.verifiedPost("/v2/sites/:siteName/media/:directoryName")
    auth.verifiedDelete("/v2/sites/:siteName/media/:directoryName")
    auth.verifiedPost("/v2/sites/:siteName/media/:directoryName/move")

    // Media files
    auth.verifiedPost("/v2/sites/:siteName/media/:directoryName/pages")
    auth.verifiedGet("/v2/sites/:siteName/media/:directoryName/pages/:fileName")
    auth.verifiedPost(
      "/v2/sites/:siteName/media/:directoryName/pages/:fileName"
    )
    auth.verifiedDelete(
      "/v2/sites/:siteName/media/:directoryName/pages/:fileName"
    )

    auth.use((req, res, next) => {
      if (!req.route) {
        return res.status(404).send("Unknown route requested")
      }
      return next()
    })
    return auth
  }
}

module.exports = { AuthMiddleware }
