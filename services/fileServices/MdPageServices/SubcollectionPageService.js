const { deslugifyCollectionName } = require("@utils/utils")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("../../../utils/markdown-utils")

class SubcollectionPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.GitHubService = gitHubService
    this.CollectionYmlService = collectionYmlService
  }

  async Create(
    reqDetails,
    { fileName, collectionName, subcollectionName, content, frontMatter }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    await this.CollectionYmlService.AddItemToOrder(reqDetails, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(subcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.GitHubService.Create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async Read(reqDetails, { fileName, collectionName, subcollectionName }) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
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
    { fileName, collectionName, subcollectionName, content, frontMatter, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
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

  async Delete(
    reqDetails,
    { fileName, collectionName, subcollectionName, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    // Remove from collection.yml
    await this.CollectionYmlService.DeleteItemFromOrder(reqDetails, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
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
      subcollectionName,
      content,
      frontMatter,
      sha,
    }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    await this.CollectionYmlService.UpdateItemInOrder(reqDetails, {
      collectionName,
      oldItem: `${subcollectionName}/${oldFileName}`,
      newItem: `${subcollectionName}/${newFileName}`,
    })

    await this.GitHubService.Delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName: parsedDirectoryName,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(subcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.GitHubService.Create(reqDetails, {
      content: newContent,
      fileName: newFileName,
      directoryName: parsedDirectoryName,
    })

    return {
      fileName: newFileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { SubcollectionPageService }
