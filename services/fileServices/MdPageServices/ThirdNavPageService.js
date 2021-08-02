const { deslugifyCollectionName } = require("@utils/utils")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("../../../utils/markdown-utils")

class ThirdNavPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.GitHubService = gitHubService
    this.CollectionYmlService = collectionYmlService
  }

  async Create(
    reqDetails,
    { fileName, collectionName, thirdNavTitle, content, frontMatter }
  ) {
    const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`

    await this.CollectionYmlService.AddItemToOrder(reqDetails, {
      collectionName,
      item: `${thirdNavTitle}/${fileName}`,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(thirdNavTitle)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.GitHubService.Create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async Read(reqDetails, { fileName, collectionName, thirdNavTitle }) {
    const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
    const { content: rawContent, sha } = await this.GitHubService.Read(
      reqDetails,
      {
        fileName,
        directoryName: parsedDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async Update(
    reqDetails,
    { fileName, collectionName, thirdNavTitle, content, frontMatter, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.GitHubService.Update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return {
      fileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }

  async Delete(reqDetails, { fileName, collectionName, thirdNavTitle, sha }) {
    const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`

    // Remove from collection.yml
    await this.CollectionYmlService.DeleteItemFromOrder(reqDetails, {
      collectionName,
      item: `${thirdNavTitle}/${fileName}`,
    })
    return this.GitHubService.Delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
  }

  async Rename(
    reqDetails,
    {
      oldFileName,
      newFileName,
      collectionName,
      thirdNavTitle,
      content,
      frontMatter,
      sha,
    }
  ) {
    await this.Delete(reqDetails, {
      fileName: oldFileName,
      collectionName,
      thirdNavTitle,
      sha,
    })
    const { sha: newSha } = await this.Create(reqDetails, {
      fileName: newFileName,
      collectionName,
      thirdNavTitle,
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

module.exports = { ThirdNavPageService }
