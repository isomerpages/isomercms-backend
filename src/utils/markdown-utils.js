const DOMPurify = require("isomorphic-dompurify")
const _ = require("lodash")

const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const getTrailingSlashWithPermalink = (permalink) =>
  permalink.endsWith("/") ? permalink : `${permalink}/`

const retrieveDataFromMarkdown = (fileContent) => {
  // eslint-disable-next-line no-unused-vars
  const [unused, encodedFrontMatter, ...pageContent] = DOMPurify.sanitize(
    fileContent
  ).split("---")
  const frontMatter = sanitizedYamlParse(encodedFrontMatter)
  return { frontMatter, pageContent: pageContent.join("---").trim() }
}

const convertDataToMarkdown = (originalFrontMatter, pageContent) => {
  const frontMatter = _.clone(originalFrontMatter)
  const { permalink } = frontMatter
  if (permalink) {
    frontMatter.permalink = getTrailingSlashWithPermalink(permalink)
  }
  const newFrontMatter = sanitizedYamlStringify(frontMatter)
  const newContent = ["---\n", newFrontMatter, "---\n", pageContent].join("")

  return DOMPurify.sanitize(newContent)
}

module.exports = {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
}
