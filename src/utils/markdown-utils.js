const _ = require("lodash")

const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const { sanitizer } = require("@services/utilServices/Sanitizer")

const getTrailingSlashWithPermalink = (permalink) =>
  permalink.endsWith("/") ? permalink : `${permalink}/`

const retrieveDataFromMarkdown = (fileContent) => {
  // eslint-disable-next-line no-unused-vars
  const [unused, encodedFrontMatter, ...pageContent] = sanitizer
    .sanitize(fileContent)
    .split("---")
  const frontMatter = sanitizedYamlParse(encodedFrontMatter)
  return { frontMatter, pageContent: pageContent.join("---").trim() }
}

const isResourceFileOrLink = (frontMatter) => {
  const { layout } = frontMatter
  return layout === "file" || layout === "link"
}

const convertDataToMarkdown = (originalFrontMatter, pageContent) => {
  const frontMatter = _.clone(originalFrontMatter)
  if (isResourceFileOrLink(frontMatter)) {
    delete frontMatter.permalink
  }
  const { permalink } = frontMatter
  if (permalink) {
    frontMatter.permalink = getTrailingSlashWithPermalink(permalink)
  }
  const newFrontMatter = sanitizedYamlStringify(frontMatter)
  const newContent = ["---\n", newFrontMatter, "---\n", pageContent].join("")
  return sanitizer.sanitize(newContent)
}

module.exports = {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
}
