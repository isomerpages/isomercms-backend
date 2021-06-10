const { FileService } = require("../github/FileService")

class UnlinkedPageService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.fileService = new FileService(this.accessToken, this.siteName)
  }

  async create(fileName, content) {
    return this.fileService.create(fileName, content, "pages")
  }

  async read(fileName) {
    return this.fileService.read(fileName, "pages")
  }

  async update(fileName, newContent) {
    return this.fileService.update(fileName, newContent, "pages")
  }

  async delete(fileName) {
    return this.fileService.delete(fileName, "pages")
  }
}

module.exports = {
  UnlinkedPageService
}
