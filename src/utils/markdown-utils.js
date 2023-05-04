const _ = require("lodash")

const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const { sanitizer } = require("@services/utilServices/Sanitizer")

const getTrailingSlashWithPermalink = (permalink) =>
  permalink.endsWith("/") ? permalink : `${permalink}/`

const recursiveUnescape = (val) => {
  if (!val) return val
  if (Array.isArray(val)) {
    return val.map(recursiveUnescape)
  }
  if (typeof val === "object") {
    return Object.keys(val).reduce((result, key) => {
      result[key] = recursiveUnescape(val[key])
      return result
    }, {})
  }
  return _.unescape(val)
}

const retrieveDataFromMarkdown = (fileContent) => {
  // eslint-disable-next-line no-unused-vars
  const [unused, encodedFrontMatter, ...pageContent] = fileContent.split("---")
  // NOTE: We separate the sanitization into 2 steps.
  // This is because DOMPurify does URL encoding when it detects html in the string.
  // For example, `<b>&something</b>` will get HTML encoded to `<b>&amp;something</b>`.
  // To prevent this behaviour from affecting our frontmatter, we do the sanitization separately
  // on the frontmatter and the content
  const frontMatter = _.mapValues(
    sanitizedYamlParse(encodedFrontMatter),
    // NOTE: We call `unescape` here to transform `&amp` into `&`.
    // Because of the above property, where DOMPurify does html encoding on detection of a html tag,
    // there might be special characters that are encoded into their html form.
    // This is a safe transformation to run because the original value was already a special character
    // so this does not do anything destructive.
    // Do note that frontmatter containing pre-existing html encoded characters (&amp;)
    // will get transformed regardless.
    (val) => recursiveUnescape(val)
  )
  const originalPageContent = pageContent.join("---")
  // NOTE: We don't sanitize if there is no page content.
  // This is to avoid injection of a HTML comment by the sanitize function.
  const sanitizedPageContent = originalPageContent
    ? sanitizer.sanitize(originalPageContent).trim()
    : ""
  return {
    frontMatter,
    pageContent: sanitizedPageContent,
  }
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
  // NOTE: We don't sanitize if there is no page content.
  // This is to avoid injection of a HTML comment by the sanitize function.
  const sanitizedPageContent = pageContent
    ? sanitizer.sanitize(pageContent)
    : ""
  // NOTE: See above on why we call `unescape`
  const newFrontMatter = _.unescape(sanitizedYamlStringify(frontMatter))
  const newContent = [
    "---\n",
    newFrontMatter,
    "---\n",
    sanitizedPageContent,
  ].join("")
  return newContent
}

module.exports = {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
}
