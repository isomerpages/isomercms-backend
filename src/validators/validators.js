const path = require("path")

const specialCharactersRegexTest = /[~%^*_+\-./\\`;~{}[\]"<>]/
const jekyllFirstCharacterRegexTest = /^[._#~]/
const dateRegexTest = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
const passwordRegexTest = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{12,}$/

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

const isPasswordValid = (password) => passwordRegexTest.test(password)

const isSafePath = (absPath, basePath) => {
  // check for poison null bytes
  if (absPath.indexOf("\0") !== -1) {
    return false
  }
  // check for backslashes
  if (absPath.indexOf("\\") !== -1) {
    return false
  }

  // check for dot segments, even if they don't normalize to anything
  if (absPath.includes("..")) {
    return false
  }

  // check if the normalized path is within the provided 'safe' base path
  if (path.resolve(basePath, path.relative(basePath, absPath)) !== absPath) {
    return false
  }
  if (absPath.indexOf(basePath) !== 0) {
    return false
  }
  return true
}

module.exports = {
  hasSpecialCharInTitle,
  isDateValid,
  isMediaPathValid,
  isPasswordValid,
  isSafePath,
}
