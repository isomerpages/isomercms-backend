class UnlinkedPageController {
  constructor({ unlinkedPageService }) {
    this.unlinkedPageService = unlinkedPageService
  }

  async createPage(reqDetails, { fileName, content, frontMatter }) {
    return this.unlinkedPageService.create(reqDetails, {
      fileName,
      content,
      frontMatter,
    })
  }

  async readPage(reqDetails, { fileName }) {
    return this.unlinkedPageService.read(reqDetails, {
      fileName,
    })
  }

  async updatePage(
    reqDetails,
    { fileName, newFileName, content, frontMatter, sha }
  ) {
    if (newFileName)
      return this.unlinkedPageService.rename(reqDetails, {
        oldFileName: fileName,
        newFileName,
        content,
        frontMatter,
        sha,
      })
    return this.unlinkedPageService.update(reqDetails, {
      fileName,
      content,
      frontMatter,
      sha,
    })
  }

  async deletePage(reqDetails, { fileName, sha }) {
    return this.unlinkedPageService.delete(reqDetails, {
      fileName,
      sha,
    })
  }
}

module.exports = { UnlinkedPageController }
