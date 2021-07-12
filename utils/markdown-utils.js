const yaml = require("yaml")

const retrieveDataFromMarkdown = (fileContent) => {
  // eslint-disable-next-line no-unused-vars
  const [unused, encodedFrontMatter, pageContent] = fileContent.split("---")
  const frontMatter = yaml.parse(encodedFrontMatter)
  return { frontMatter, pageContent }
}

const convertDataToMarkdown = (frontMatter, pageContent) => {
  const newFrontMatter = yaml.stringify(frontMatter)
  const newContent = ["---\n", newFrontMatter, "---\n", pageContent].join("")
  return newContent
}

module.exports = {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
}
