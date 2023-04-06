const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { CONTACT_US_FILENAME } = require("@root/constants/pages")

const CONTACT_US_DIRECTORY_NAME = "pages"

class ContactUsPageService {
  constructor({ gitHubService, footerYmlService }) {
    this.gitHubService = gitHubService
    this.footerYmlService = footerYmlService
  }

  async read(sessionData) {
    // Due to template intricacies, the feedback url is read from/stored in the footer -
    // the contact-us link to the feedback page is taken from the feedback url stored in the footer.yml file
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: CONTACT_US_FILENAME,
        directoryName: CONTACT_US_DIRECTORY_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    const { content: footerContent } = await this.footerYmlService.read(
      sessionData
    )
    frontMatter.feedback = footerContent.feedback
    return { content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(sessionData, { content, frontMatter, sha }) {
    // Due to template intricacies, the feedback url is read from/stored in the footer -
    // the contact-us link to the feedback page is taken from the feedback url stored in the footer.yml file
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(sessionData, {
      fileContent: newContent,
      sha,
      fileName: CONTACT_US_FILENAME,
      directoryName: CONTACT_US_DIRECTORY_NAME,
    })
    const {
      content: footerContent,
      sha: footerSha,
    } = await this.footerYmlService.read(sessionData)
    footerContent.feedback = frontMatter.feedback
    await this.footerYmlService.update(sessionData, {
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
