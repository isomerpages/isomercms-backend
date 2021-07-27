const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

class CollectionPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.GitHubService = gitHubService
    this.CollectionYmlService = collectionYmlService
  }

  async Create(reqDetails, { fileName, collectionName, content, frontMatter }) {
    const parsedCollectionName = `_${collectionName}`

    await this.CollectionYmlService.AddItemToOrder(reqDetails, {
      collectionName,
      item: fileName,
    })

    // We want to make sure that the front matter has no third nav title parameter
    delete frontMatter.third_nav_title
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.GitHubService.Create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedCollectionName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async Read(reqDetails, { fileName, collectionName }) {
    const parsedCollectionName = `_${collectionName}`
    const { content: rawContent, sha } = await this.GitHubService.Read(
      reqDetails,
      {
        fileName,
        directoryName: parsedCollectionName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async Update(
    reqDetails,
    { fileName, collectionName, content, frontMatter, sha }
  ) {
    const parsedCollectionName = `_${collectionName}`
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.GitHubService.Update(reqDetails, {
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

  async Delete(reqDetails, { fileName, collectionName, sha }) {
    const parsedCollectionName = `_${collectionName}`

    // Remove from collection.yml
    await this.CollectionYmlService.DeleteItemFromOrder(reqDetails, {
      collectionName,
      item: fileName,
    })
    return this.GitHubService.Delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedCollectionName,
    })
  }

  async Rename(
    reqDetails,
    { oldFileName, newFileName, collectionName, content, frontMatter, sha }
  ) {
    await this.Delete(reqDetails, {
      fileName: oldFileName,
      collectionName,
      sha,
    })
    const { sha: newSha } = await this.Create(reqDetails, {
      fileName: newFileName,
      collectionName,
      content,
      frontMatter,
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
