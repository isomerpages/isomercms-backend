const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const { NotFoundError } = require("@errors/NotFoundError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { File, ResourcePageType } = require("@classes/File.js")
const { Resource } = require("@classes/Resource.js")
const { ResourceRoom } = require("@classes/ResourceRoom.js")

// List pages in resource
async function listResourcePages(req, res) {
  const { accessToken } = req
  const { siteName, resourceName } = req.params

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()

  // Check if resource category exists
  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)
  const resourceCategories = resources.map((resource) => resource.dirName)
  if (!resourceCategories.includes(resourceName))
    throw new NotFoundError(`Resource category ${resourceName} was not found!`)

  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  let resourcePages = []
  try {
    resourcePages = await IsomerFile.list()
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error
  }
  return res.status(200).json({ resourcePages })
}

// Create new page in resource
async function createNewResourcePage(req, res) {
  const { accessToken } = req

  const { siteName, resourceName, pageName } = req.params
  const { content: pageContent } = req.body

  // TO-DO:
  // Validate pageName and content
  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()

  // Check if resource category exists and create if it does not
  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)
  const resourceCategories = resources.map((resource) => resource.dirName)
  if (!resourceCategories.includes(resourceName)) {
    await IsomerResource.create(resourceRoomName, resourceName)
  }

  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)

  const { sha } = await IsomerFile.create(pageName, Base64.encode(pageContent))

  return res.status(200).json({ resourceName, pageName, pageContent, sha })
}

// Read page in resource
async function readResourcePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, resourceName } = req.params

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha, content: encodedContent } = await IsomerFile.read(pageName)
  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  return res
    .status(200)
    .json({ resourceRoomName, resourceName, pageName, sha, content })
}

// Update page in resource
async function updateResourcePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, resourceName } = req.params
  const { content: pageContent, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { newSha } = await IsomerFile.update(
    pageName,
    Base64.encode(pageContent),
    sha
  )

  return res
    .status(200)
    .json({ resourceName, pageName, pageContent, sha: newSha })
}

// Delete page in resource
async function deleteResourcePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, resourceName } = req.params
  const { sha } = req.body

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  await IsomerFile.delete(pageName, sha)

  return res.status(200).send("OK")
}

// Rename page in resource
async function renameResourcePage(req, res) {
  const { accessToken } = req

  const { siteName, pageName, resourceName, newPageName } = req.params
  const { sha, content: pageContent } = req.body

  // TO-DO:
  // Validate that resource exists
  // Validate pageName and content

  // Create new resource page with name ${newPageName}

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha: newSha } = await IsomerFile.create(
    newPageName,
    Base64.encode(pageContent)
  )
  await IsomerFile.delete(pageName, sha)

  return res
    .status(200)
    .json({ resourceName, pageName: newPageName, pageContent, sha: newSha })
}

router.get("/", attachReadRouteHandlerWrapper(listResourcePages))
router.post(
  "/pages/new/:pageName",
  attachRollbackRouteHandlerWrapper(createNewResourcePage)
)
router.get("/pages/:pageName", attachReadRouteHandlerWrapper(readResourcePage))
router.post(
  "/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateResourcePage)
)
router.delete(
  "/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteResourcePage)
)
router.post(
  "/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renameResourcePage)
)

module.exports = router
