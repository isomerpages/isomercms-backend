const specialCharactersRegexTest = /[~!@#$%^&*_+\-./\\\`:;~{}()[\]"'<>,?]/

const titleSpecialCharCheck = (title) => specialCharactersRegexTest.test(title)

module.exports = {
  titleSpecialCharCheck,
}
