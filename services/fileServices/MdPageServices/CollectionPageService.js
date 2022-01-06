const { BadRequestError } = require("@errors/BadRequestError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { titleSpecialCharCheck } = require("@validators/validators")

class CollectionPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.gitHubService = gitHubService
    this.collectionYmlService = collectionYmlService
  }

  async create(
    reqDetails,
    { fileName, collectionName, content, frontMatter, shouldIgnoreCheck }
  ) {
    if (
      !shouldIgnoreCheck &&
      titleSpecialCharCheck({ title: fileName, isFile: true })
    )
      throw new BadRequestError("Special characters not allowed in file name")
    const parsedCollectionName = `_${collectionName}`

    await this.collectionYmlService.addItemToOrder(reqDetails, {
      collectionName,
      item: fileName,
    })

    // We want to make sure that the front matter has no third nav title parameter
    delete frontMatter.third_nav_title
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedCollectionName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(reqDetails, { fileName, collectionName }) {
    const parsedCollectionName = `_${collectionName}`
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName,
        directoryName: parsedCollectionName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(
    reqDetails,
    { fileName, collectionName, content, frontMatter, sha }
  ) {
    const parsedCollectionName = `_${collectionName}`
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName,
      directoryName: parsedCollectionName,
    })
    return {
      fileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }

  async delete(reqDetails, { fileName, collectionName, sha }) {
    const parsedCollectionName = `_${collectionName}`

    // Remove from collection.yml
    await this.collectionYmlService.deleteItemFromOrder(reqDetails, {
      collectionName,
      item: fileName,
    })
    return this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedCollectionName,
    })
  }

  async rename(
    reqDetails,
    { oldFileName, newFileName, collectionName, content, frontMatter, sha }
  ) {
    if (titleSpecialCharCheck({ title: newFileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
    const parsedCollectionName = `_${collectionName}`

    await this.collectionYmlService.updateItemInOrder(reqDetails, {
      collectionName,
      oldItem: oldFileName,
      newItem: newFileName,
    })

    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName: parsedCollectionName,
    })

    // We want to make sure that the front matter has no third nav title parameter
    delete frontMatter.third_nav_title
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName: newFileName,
      directoryName: parsedCollectionName,
    })
    return {
      fileName: newFileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { CollectionPageService }
