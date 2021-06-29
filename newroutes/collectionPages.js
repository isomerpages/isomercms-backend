const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")

// Import utils

const router = express.Router()

// // Create new page in collection
async function createCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, collectionName, pageName: encodedPageName } = req.params
  const { content: pageContent } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    await ThirdNavPageService.Create(
      { siteName, accessToken },
      {
        fileName: parsedPageName,
        collectionName,
        content: pageContent,
        thirdNavTitle,
      }
    )

    return res.status(200).json({ collectionName, pageName, pageContent })
  }
  await CollectionPageService.Create(
    { siteName, accessToken },
    { fileName: pageName, collectionName, content: pageContent }
  )

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    const { sha, content } = await ThirdNavPageService.Read(
      { siteName, accessToken },
      { fileName: parsedPageName, collectionName, thirdNavTitle }
    )

    return res.status(200).json({ collectionName, pageName, sha, content })
  }
  const { sha, content } = await CollectionPageService.Read(
    { siteName, accessToken },
    { fileName: pageName, collectionName }
  )

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    const { newSha } = await ThirdNavPageService.Update(
      { siteName, accessToken },
      {
        fileName: parsedPageName,
        collectionName,
        content: pageContent,
        thirdNavTitle,
        sha,
      }
    )

    return res
      .status(200)
      .json({ collectionName, pageName, pageContent, sha: newSha })
  }
  const { newSha } = await CollectionPageService.Update(
    { siteName, accessToken },
    { fileName: pageName, collectionName, content: pageContent, sha }
  )
  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    await ThirdNavPageService.Delete(
      { siteName, accessToken },
      { fileName: parsedPageName, collectionName, thirdNavTitle, sha }
    )

    return res.status(200).send("OK")
  }
  await CollectionPageService.Delete(
    { siteName, accessToken },
    { fileName: pageName, collectionName, sha }
  )

  return res.status(200).send("OK")
}

// Rename page in collection
async function renameCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedOldPageName] = pageName.split("/")
    const [unused, parsedNewPageName] = newPageName.split("/")
    const { newSha } = await ThirdNavPageService.Rename(
      { siteName, accessToken },
      {
        oldFileName: parsedOldPageName,
        newFileName: parsedNewPageName,
        thirdNavTitle,
        collectionName,
        content: pageContent,
        sha,
      }
    )

    return res
      .status(200)
      .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
  }
  const { newSha } = await CollectionPageService.Rename(
    { siteName, accessToken },
    {
      oldFileName: pageName,
      newFileName: newPageName,
      collectionName,
      content: pageContent,
      sha,
    }
  )

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

router.post(
  "/:siteName/collections/:collectionName/pages/new/:pageName",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.delete(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renameCollectionPage)
)

module.exports = router
