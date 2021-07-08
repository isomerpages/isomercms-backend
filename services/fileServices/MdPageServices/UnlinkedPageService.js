const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const GitHubService = require("@services/db/GitHubService")

const UNLINKED_PAGE_DIR = "pages"

const Create = async (reqDetails, { fileName, content, frontMatter }) => {
  // We want to make sure that the front matter has no third nav title parameter
  // TODO: consider having frontend pass frontmatter separately from page content
  delete frontMatter.third_nav_title
  const newContent = convertDataToMarkdown(frontMatter, pageContent)

  const { sha } = await GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    directoryName: UNLINKED_PAGE_DIR,
  })
  return { fileName, content: { frontMatter, content }, sha }
}

const Read = async (reqDetails, { fileName }) => {
  const { content: rawContent, sha } = await GitHubService.Read(reqDetails, {
    fileName,
    directoryName: UNLINKED_PAGE_DIR,
  })
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
  return { fileName, content: { frontMatter, content: pageContent }, sha }
}

const Update = async (reqDetails, { fileName, content, frontMatter, sha }) => {
  const newContent = convertDataToMarkdown(frontMatter, content)
  const { newSha } = await GitHubService.Update(reqDetails, {
    fileContent: content,
    sha,
    fileName,
    directoryName: UNLINKED_PAGE_DIR,
  })
  return { fileName, content: { frontMatter, content }, oldSha: sha, newSha }
}

const Delete = async (reqDetails, { fileName, sha }) =>
  GitHubService.Delete(reqDetails, {
    sha,
    fileName,
    directoryName: UNLINKED_PAGE_DIR,
  })

const Rename = async (
  reqDetails,
  { oldFileName, newFileName, content, frontMatter, sha }
) => {
  await Delete(reqDetails, { fileName: oldFileName, sha })
  const { sha: newSha } = await Create(reqDetails, {
    fileName: newFileName,
    content,
    frontMatter,
  })
  return {
    fileName: newFileName,
    content: { frontMatter, content },
    oldSha: sha,
    newSha,
  }
}

module.exports = {
  Create,
  Read,
  Update,
  Delete,
  Rename,
}
