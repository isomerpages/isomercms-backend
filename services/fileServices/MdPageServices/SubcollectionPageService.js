const { deslugifyCollectionName } = require("@utils/utils")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("../../../utils/markdown-utils")

class SubcollectionPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.gitHubService = gitHubService
    this.collectionYmlService = collectionYmlService
  }

  async create(
    reqDetails,
    { fileName, collectionName, subcollectionName, content, frontMatter }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    await this.collectionYmlService.addItemToOrder(reqDetails, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(subcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(reqDetails, { fileName, collectionName, subcollectionName }) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName,
        directoryName: parsedDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(
    reqDetails,
    { fileName, collectionName, subcollectionName, content, frontMatter, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
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

  async delete(
    reqDetails,
    { fileName, collectionName, subcollectionName, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    // Remove from collection.yml
    await this.collectionYmlService.deleteItemFromOrder(reqDetails, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
    })
    return this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
  }

  async rename(
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

    await this.collectionYmlService.updateItemInOrder(reqDetails, {
      collectionName,
      oldItem: `${subcollectionName}/${oldFileName}`,
      newItem: `${subcollectionName}/${newFileName}`,
    })

    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName: parsedDirectoryName,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(subcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.gitHubService.create(reqDetails, {
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
