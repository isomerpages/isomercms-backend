const { BadRequestError } = require("@errors/BadRequestError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")
const { deslugifyCollectionName } = require("@utils/utils")

const { hasSpecialCharInTitle } = require("@validators/validators")

class SubcollectionPageService {
  constructor({ gitHubService, collectionYmlService }) {
    this.gitHubService = gitHubService
    this.collectionYmlService = collectionYmlService
  }

  async create(
    sessionData,
    {
      fileName,
      collectionName,
      subcollectionName,
      content,
      frontMatter,
      shouldIgnoreCheck,
    }
  ) {
    if (
      !shouldIgnoreCheck &&
      hasSpecialCharInTitle({ title: fileName, isFile: true })
    )
      throw new BadRequestError(
        `Special characters not allowed when creating files. Given name: ${fileName}`
      )
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    await this.collectionYmlService.addItemToOrder(sessionData, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
    })

    frontMatter.third_nav_title = deslugifyCollectionName(subcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(sessionData, { fileName, collectionName, subcollectionName }) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName,
        directoryName: parsedDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(
    sessionData,
    { fileName, collectionName, subcollectionName, content, frontMatter, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(sessionData, {
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
    sessionData,
    { fileName, collectionName, subcollectionName, sha }
  ) {
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    // Remove from collection.yml
    await this.collectionYmlService.deleteItemFromOrder(sessionData, {
      collectionName,
      item: `${subcollectionName}/${fileName}`,
    })
    return this.gitHubService.delete(sessionData, {
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
  }

  async rename(
    sessionData,
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
    if (hasSpecialCharInTitle({ title: newFileName, isFile: true }))
      throw new BadRequestError(
        `Special characters not allowed when renaming files. Given name: ${newFileName}`
      )
    const parsedDirectoryName = `_${collectionName}/${subcollectionName}`

    await this.collectionYmlService.updateItemInOrder(sessionData, {
      collectionName,
      oldItem: `${subcollectionName}/${oldFileName}`,
      newItem: `${subcollectionName}/${newFileName}`,
    })

    await this.gitHubService.delete(sessionData, {
      sha,
      fileName: oldFileName,
      directoryName: parsedDirectoryName,
    })

    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.gitHubService.create(sessionData, {
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

  // Used for updating the third_nav_title only without touching the collection.yml
  async updateSubcollection(
    sessionData,
    { fileName, collectionName, oldSubcollectionName, newSubcollectionName }
  ) {
    const {
      sha,
      content: { frontMatter, pageBody },
    } = await this.read(sessionData, {
      fileName,
      collectionName,
      subcollectionName: oldSubcollectionName,
    })

    const parsedOldDirectoryName = `_${collectionName}/${oldSubcollectionName}`
    const parsedNewDirectoryName = `_${collectionName}/${newSubcollectionName}`
    frontMatter.third_nav_title = deslugifyCollectionName(newSubcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, pageBody)
    await this.gitHubService.delete(sessionData, {
      sha,
      fileName,
      directoryName: parsedOldDirectoryName,
    })
    return this.gitHubService.create(sessionData, {
      content: newContent,
      fileName,
      directoryName: parsedNewDirectoryName,
    })
  }
}

module.exports = { SubcollectionPageService }
