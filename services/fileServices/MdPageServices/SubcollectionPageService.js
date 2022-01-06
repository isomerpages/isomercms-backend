const { BadRequestError } = require("@errors/BadRequestError")

const { deslugifyCollectionName } = require("@utils/utils")

const { titleSpecialCharCheck } = require("@validators/validators")

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
      titleSpecialCharCheck({ title: fileName, isFile: true })
    )
      throw new BadRequestError("Special characters not allowed in file name")
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
    if (titleSpecialCharCheck({ title: newFileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
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

  // Used for updating the third_nav_title only without touching the collection.yml
  async updateSubcollection(
    reqDetails,
    { fileName, collectionName, oldSubcollectionName, newSubcollectionName }
  ) {
    const {
      sha,
      content: { frontMatter, pageBody },
    } = await this.read(reqDetails, {
      fileName,
      collectionName,
      subcollectionName: oldSubcollectionName,
    })

    const parsedOldDirectoryName = `_${collectionName}/${oldSubcollectionName}`
    const parsedNewDirectoryName = `_${collectionName}/${newSubcollectionName}`
    frontMatter.third_nav_title = deslugifyCollectionName(newSubcollectionName)
    const newContent = convertDataToMarkdown(frontMatter, pageBody)
    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedOldDirectoryName,
    })
    return this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedNewDirectoryName,
    })
  }
}

module.exports = { SubcollectionPageService }
