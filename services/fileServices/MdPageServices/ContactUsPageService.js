const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const CONTACT_US_FILE_NAME = "contact-us.md"
const CONTACT_US_DIRECTORY_NAME = "pages"

class ContactUsPageService {
  constructor({ gitHubService, footerYmlService }) {
    this.gitHubService = gitHubService
    this.footerYmlService = footerYmlService
  }

  async read(reqDetails) {
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: CONTACT_US_FILE_NAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    const { content: footerContent } = await this.footerYmlService.read(
      reqDetails
    )
    frontMatter.feedback = footerContent.feedback
    return { content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(reqDetails, { content, frontMatter, sha }) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName: CONTACT_US_FILE_NAME,
      directoryName: CONTACT_US_DIRECTORY_NAME,
    })
    const {
      content: footerContent,
      sha: footerSha,
    } = await this.footerYmlService.read(reqDetails)
    footerContent.feedback = frontMatter.feedback
    await this.footerYmlService.update(reqDetails, {
      fileContent: footerContent,
      sha: footerSha,
    })
    return {
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { ContactUsPageService }
