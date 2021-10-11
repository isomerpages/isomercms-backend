const specialCharactersRegexTest = /[~%^*_+\-./\\`;~{}[\]"<>]/

const titleSpecialCharCheck = (title, isFile = false) => {
  let testTitle = title
  if (isFile) {
    // Remove .md
    testTitle = title.replace(/.md$/, "")
  }
  return specialCharactersRegexTest.test(testTitle)
}

module.exports = {
  titleSpecialCharCheck,
}
