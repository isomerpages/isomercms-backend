const BaseDirectoryService = require("./BaseDirectoryService")

const PAGE_DIRECTORY = "pages"

const ListUnlinkedPages = async (reqDetails) => {
  const filesOrDirs = await BaseDirectoryService.List(reqDetails, {
    directoryName: PAGE_DIRECTORY,
  })

  const files = filesOrDirs
    .filter((object) => object.type === "file")
    .map((object) => ({
      path: encodeURIComponent(object.path),
      fileName: object.name,
      sha: object.sha,
    }))

  return files
}

module.exports = {
  ListUnlinkedPages,
}
