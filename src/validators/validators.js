const specialCharactersRegexTest = /[~%^*_+\-./\\`;~{}[\]"<>]/
const jekyllFirstCharacterRegexTest = /^[._#~]/
const dateRegexTest = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

const mediaSpecialCharactersRegexTest = /[~%^#*+\./\\`;~{}[\]"<>]/ // Allows dashes
// Allows only media root folders (/images or /files) and media subdirectories (/images/subdir or /files/subdir) with no banned characters
const mediaSubfolderRegexText = /^(images|files|(images|files)\/[^#?~%^*+\.\\`;~{}[\]"<>]+)$/

const hasSpecialCharInTitle = ({ title, isFile = false }) => {
  let testTitle = title
  if (isFile) {
    // Remove .md
    testTitle = title.replace(/.md$/, "")
  }
  return (
    specialCharactersRegexTest.test(testTitle) ||
    jekyllFirstCharacterRegexTest.test(testTitle)
  )
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
  hasSpecialCharInTitle,
  isDateValid,
  isMediaPathValid,
}
