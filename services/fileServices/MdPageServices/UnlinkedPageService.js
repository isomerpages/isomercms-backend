const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const GitHubService = require("@services/db/GitHubService")

const UNLINKED_PAGE_DIR = "pages"

const Create = async (reqDetails, { fileName, content }) => {
  // We want to make sure that the front matter has no third nav title parameter
  // TODO: consider having frontend pass frontmatter separately from page content
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(content)
  delete frontMatter.third_nav_title
  const newContent = convertDataToMarkdown(frontMatter, pageContent)

  return GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    dir: UNLINKED_PAGE_DIR,
  })
}

const Read = async (reqDetails, { fileName }) =>
  GitHubService.Read(reqDetails, { fileName, dir: UNLINKED_PAGE_DIR })

const Update = async (reqDetails, { fileName, content, sha }) =>
  GitHubService.Update(reqDetails, {
    fileContent: content,
    sha,
    fileName,
    dir: UNLINKED_PAGE_DIR,
  })

const Delete = async (reqDetails, { fileName, sha }) =>
  GitHubService.Delete(reqDetails, {
    sha,
    fileName,
    dir: UNLINKED_PAGE_DIR,
  })

const Rename = async (
  reqDetails,
  { oldFileName, newFileName, content, sha }
) => {
  await Delete(reqDetails, { fileName: oldFileName, sha })
  await Create(reqDetails, { fileName: newFileName, content })
  return { newSha: sha }
}

module.exports = {
  Create,
  Read,
  Update,
  Delete,
  Rename,
}
