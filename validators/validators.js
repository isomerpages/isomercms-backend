const specialCharactersRegexTest = /[~%^*_+\-./\\`;~{}[\]"<>]/
const dateRegexTest = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

const titleSpecialCharCheck = ({ title, isFile = false }) => {
  let testTitle = title
  if (isFile) {
    // Remove .md
    testTitle = title.replace(/.md$/, "")
  }
  return specialCharactersRegexTest.test(testTitle)
}

const isDateValid = (date) => dateRegexTest.test(date)

module.exports = {
  titleSpecialCharCheck,
  isDateValid,
}
