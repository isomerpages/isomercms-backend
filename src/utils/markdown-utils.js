const DOMPurify = require("isomorphic-dompurify")
const _ = require("lodash")
const yaml = require("yaml")

const getTrailingSlashWithPermalink = (permalink) =>
  permalink.endsWith("/") ? permalink : `${permalink}/`

const retrieveDataFromMarkdown = (fileContent) => {
  // eslint-disable-next-line no-unused-vars
  const [unused, encodedFrontMatter, ...pageContent] = DOMPurify.sanitize(
    fileContent
  ).split("---")
  const frontMatter = yaml.parse(encodedFrontMatter)
  return { frontMatter, pageContent: pageContent.join("---") }
}

const convertDataToMarkdown = (originalFrontMatter, pageContent) => {
  const frontMatter = _.clone(originalFrontMatter)
  const { permalink } = frontMatter
  if (permalink) {
    frontMatter.permalink = getTrailingSlashWithPermalink(permalink)
  }
  const newFrontMatter = yaml.stringify(frontMatter)
  const newContent = ["---\n", newFrontMatter, "---\n", pageContent].join("")

  return DOMPurify.sanitize(newContent)
}

module.exports = {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
}
