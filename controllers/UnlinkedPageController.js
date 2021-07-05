const BaseDirectoryService = require("@services/directoryServices/BaseDirectoryService")
const UnlinkedPageService = require("@services/fileServices/MdPageServices/UnlinkedPageService")
const MoverService = require("@services/MoverService")

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

const CreatePage = async (reqDetails, { fileName, content }) =>
  UnlinkedPageService.Create(reqDetails, { fileName, content })

const ReadPage = async (reqDetails, { fileName }) =>
  UnlinkedPageService.Read(reqDetails, { fileName })

const UpdatePage = async (
  reqDetails,
  { fileName, newFileName, content, sha }
) => {
  if (newFileName)
    return UnlinkedPageService.Rename(reqDetails, {
      oldFileName: fileName,
      newFileName,
      content,
      sha,
    })
  return UnlinkedPageService.Update(reqDetails, { fileName, content, sha })
}

const DeletePage = async (reqDetails, { fileName, sha }) =>
  UnlinkedPageService.Delete(reqDetails, { fileName, sha })

const MovePages = async (
  reqDetails,
  { files, newFileCollection, newFileThirdNav }
) => {
  for (const fileName of files) {
    await MoverService.MovePage(reqDetails, {
      fileName,
      newFileCollection,
      newFileThirdNav,
    })
  }
}

module.exports = {
  ListUnlinkedPages,
  CreatePage,
  ReadPage,
  UpdatePage,
  DeletePage,
  MovePages,
}
