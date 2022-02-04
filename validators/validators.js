const specialCharactersRegexTest = /[~%^*_+\-./\\`;~{}[\]"<>]/
const dateRegexTest = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

const mediaSpecialCharactersRegexTest = /[~%^#*+\./\\`;~{}[\]"<>]/ // Allows dashes
const mediaSubfolderRegexText = /^(images|files|(images|files)\/[^~%^*+\.\\`;~{}[\]"<>]+)$/

const titleSpecialCharCheck = ({ title, isFile = false }) => {
  let testTitle = title
  if (isFile) {
    // Remove .md
    testTitle = title.replace(/.md$/, "")
  }
  return specialCharactersRegexTest.test(testTitle)
}

const isDateValid = (date) => dateRegexTest.test(date)

const isMediaPathValid = ({ path, isFile = false }) => {
  if (isFile) {
    // Remove extensions
    let testTitle = path
    testTitle = path.replace(/\.[a-zA-Z]{3,4}$/, "")
    return !mediaSpecialCharactersRegexTest.test(testTitle)
  }
  return mediaSubfolderRegexText.test(path)
}

module.exports = {
  titleSpecialCharCheck,
  isDateValid,
  isMediaPathValid,
}
