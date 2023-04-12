import { statsMiddleware } from "@root/middleware/stats"

const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const { NotFoundError } = require("@errors/NotFoundError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { File, ResourcePageType } = require("@classes/File")
const { Resource } = require("@classes/Resource")
const { ResourceRoom } = require("@classes/ResourceRoom")

// Import errors

// List resources
async function listResources(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)

  return res.status(200).json({ resourceRoomName, resources })
}

// Create new resource
async function createNewResource(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { resourceName } = req.body
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.create(resourceRoomName, resourceName)

  return res.status(200).json({ resourceName })
}

// Delete resource
async function deleteResource(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, resourceName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.delete(resourceRoomName, resourceName)

  return res.status(200).send("OK")
}

// Rename resource
async function renameResource(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, resourceName, newResourceName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.rename(resourceRoomName, resourceName, newResourceName)

  return res.status(200).json({ resourceName, newResourceName })
}

// To fix after refactoring
/* eslint-disable no-await-in-loop, no-restricted-syntax */
// Move resource
async function moveResources(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, resourceName, newResourceName } = req.params
  const { files } = req.body
  const { accessToken } = userWithSiteSessionData

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()

  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)
  const resourceCategories = resources.map((resource) => resource.dirName)
  if (!resourceCategories.includes(resourceName))
    throw new NotFoundError(`Resource category ${resourceName} was not found!`)
  if (!resourceCategories.includes(newResourceName))
    throw new NotFoundError(
      `Resource category ${newResourceName} was not found!`
    )

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldResourcePageType = new ResourcePageType(
    resourceRoomName,
    resourceName
  )
  const newResourcePageType = new ResourcePageType(
    resourceRoomName,
    newResourceName
  )
  oldIsomerFile.setFileType(oldResourcePageType)
  newIsomerFile.setFileType(newResourcePageType)

  for (const fileName of files) {
    const { content, sha } = await oldIsomerFile.read(fileName)
    await oldIsomerFile.delete(fileName, sha)
    await newIsomerFile.create(fileName, content)
  }
  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "listResources"),
  attachReadRouteHandlerWrapper(listResources)
)
router.post(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "createNewResource"),
  attachRollbackRouteHandlerWrapper(createNewResource)
)
router.delete(
  "/:resourceName",
  statsMiddleware.logVersionNumberCallFor(1, "deleteResource"),
  attachRollbackRouteHandlerWrapper(deleteResource)
)
router.post(
  "/:resourceName/rename/:newResourceName",
  statsMiddleware.logVersionNumberCallFor(1, "renameResource"),
  attachRollbackRouteHandlerWrapper(renameResource)
)
router.post(
  "/:resourceName/move/:newResourceName",
  statsMiddleware.logVersionNumberCallFor(1, "moveResources"),
  attachRollbackRouteHandlerWrapper(moveResources)
)

module.exports = router
