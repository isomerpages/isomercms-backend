const {
  CollectionYmlService,
} = require("@services/fileServices/YmlFileServices/CollectionYmlService")

const COLLECTION_FILE_NAME = "collection.yml"
const yaml = require("yaml")
const _ = require("lodash")

describe("Collection Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const subcollectionFileName = "test-subcollection-file"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const directoryName = `_${collectionName}`
  const sha = "12345"

  const reqDetails = { siteName, accessToken }
  const orderArray = [
    `${fileName}.md`,
    `${subcollectionName}/.keep`,
    `${subcollectionName}/${subcollectionFileName}.md`,
    `${subcollectionName}/${subcollectionFileName}2.md`,
    `${fileName}2.md`,
  ]

  const mockParsedContent = {
    collections: {
      [collectionName]: {
        output: true,
        order: orderArray,
      },
    },
  }
  const mockRawContent = yaml.stringify(mockParsedContent)

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
  }

  const service = new CollectionYmlService({
    gitHubService: mockGithubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha,
    }),
      it("Reading a collection.yml file works correctly", async () => {
        await expect(
          service.read(reqDetails, { collectionName })
        ).resolves.toMatchObject({ content: mockParsedContent, sha })
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName: COLLECTION_FILE_NAME,
          directoryName,
        })
      })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    it("Updating raw content works correctly", async () => {
      await expect(
        service.update(reqDetails, {
          collectionName,
          fileContent: mockParsedContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: mockRawContent,
        sha: oldSha,
      })
    })
  })

  describe("Create", () => {
    beforeEach(() => {
      mockGithubService.create.mockResolvedValueOnce({ sha })
    })
    it("Creating a collection.yml file with no specified files works correctly", async () => {
      const content = yaml.stringify({
        collections: {
          [collectionName]: {
            output: true,
            order: [],
          },
        },
      })
      await expect(
        service.create(reqDetails, {
          collectionName,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content,
        fileName: COLLECTION_FILE_NAME,
        directoryName,
      })
    })
    it("Creating a collection.yml file with specified files works correctly", async () => {
      const content = yaml.stringify({
        collections: {
          [collectionName]: {
            output: true,
            order: orderArray,
          },
        },
      })
      await expect(
        service.create(reqDetails, {
          collectionName,
          orderArray,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content,
        fileName: COLLECTION_FILE_NAME,
        directoryName,
      })
    })
  })

  describe("ListContents", () => {
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha,
    })
    it("Parses the collection.yml file and returns an array of files", async () => {
      await expect(
        service.listContents(reqDetails, {
          collectionName,
        })
      ).resolves.toMatchObject(orderArray)
    })
  })

  describe("AddItemToOrder", () => {
    const oldSha = "54321"
    beforeEach(() => {
      mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
      mockGithubService.read.mockResolvedValueOnce({
        content: mockRawContent,
        sha: oldSha,
      })
    })

    it("Adding an collection page with unspecified index adds it to the front of the order", async () => {
      const newFileName = "test.md"
      const expectedArray = [newFileName, ...orderArray]
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.addItemToOrder(reqDetails, {
          collectionName,
          item: newFileName,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Adding an third nav page with unspecified index and no other existing files with the same third nav adds it to the front of the order", async () => {
      const newFileName = "new-subcollection/test.md"
      const expectedArray = [newFileName, ...orderArray]
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.addItemToOrder(reqDetails, {
          collectionName,
          item: newFileName,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Adding an third nav page with unspecified index and an existing file with the same third nav adds it in the position of the first file with that third nav", async () => {
      const newFileName = `${subcollectionName}/test3.md`
      const expectedArray = [...orderArray]
      expectedArray.splice(1, 0, newFileName)
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.addItemToOrder(reqDetails, {
          collectionName,
          item: newFileName,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Adding an collection page with specified index adds it at that position", async () => {
      const addedIndex = 2
      const newFileName = "test.md"
      const expectedArray = [...orderArray]
      expectedArray.splice(addedIndex, 0, newFileName)
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.addItemToOrder(reqDetails, {
          collectionName,
          item: newFileName,
          index: addedIndex,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Adding an third nav page with a specified index adds it at that position", async () => {
      const addedIndex = 2
      const newFileName = "new-subcollection/.keep"
      const expectedArray = [...orderArray]
      expectedArray.splice(addedIndex, 0, newFileName)
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.addItemToOrder(reqDetails, {
          collectionName,
          item: newFileName,
          index: addedIndex,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })

  describe("DeleteItemFromOrder", () => {
    const oldSha = "54321"
    beforeEach(() => {
      mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
      mockGithubService.read.mockResolvedValueOnce({
        content: mockRawContent,
        sha: oldSha,
      })
    })

    it("Deleting a collection page works correctly", async () => {
      const expectedArray = orderArray.filter(
        (item) => item !== `${fileName}.md`
      )
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.deleteItemFromOrder(reqDetails, {
          collectionName,
          item: `${fileName}.md`,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Deleting a third nav page works correctly", async () => {
      const itemName = `${subcollectionName}/${subcollectionFileName}.md`
      const expectedArray = orderArray.filter((item) => item !== itemName)
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.deleteItemFromOrder(reqDetails, {
          collectionName,
          item: itemName,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })

    it("Deleting a non-existent page does nothing", async () => {
      const itemName = `nonexistent-file`
      const expectedArray = orderArray
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      await expect(
        service.deleteItemFromOrder(reqDetails, {
          collectionName,
          item: itemName,
        })
      )
      expect(mockGithubService.update).not.toHaveBeenCalled()
    })
  })

  describe("UpdateItemInOrder", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha: oldSha,
    })

    it("Renaming a page in the order works correctly", async () => {
      const renamedItem = "renamed.md"
      const index = orderArray.indexOf(`${fileName}2.md`)
      const expectedArray = [...orderArray]
      expectedArray.splice(index, 1)
      expectedArray.splice(index, 0, renamedItem)
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.updateItemInOrder(reqDetails, {
          collectionName,
          oldItem: `${fileName}2.md`,
          newItem: renamedItem,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })

  describe("RenameCollectionInOrder", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha: oldSha,
    })

    it("Renaming the collection works correctly", async () => {
      const renamedCollection = "renamed"
      const modifiedParsedContent = {
        collections: {
          [renamedCollection]: mockParsedContent.collections[collectionName],
        },
      }
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.renameCollectionInOrder(reqDetails, {
          oldCollectionName: collectionName,
          newCollectionName: renamedCollection,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName: `_${renamedCollection}`,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })

  describe("DeleteSubfolderFromOrder", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha: oldSha,
    })

    it("Deleting a subcollection works correctly", async () => {
      const expectedArray = orderArray.filter(
        (item) => !item.includes(subcollectionName)
      )
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.deleteSubfolderFromOrder(reqDetails, {
          collectionName,
          subfolder: subcollectionName,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })

  describe("RenameSubfolderInOrder", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha: oldSha,
    })

    it("Renaming a subcollection works correctly", async () => {
      const renamedSubcollection = "renamed-subcollection"
      const expectedArray = orderArray.map((item) =>
        item.replace(subcollectionName, renamedSubcollection)
      )
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = expectedArray
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.renameSubfolderInOrder(reqDetails, {
          collectionName,
          oldSubfolder: subcollectionName,
          newSubfolder: renamedSubcollection,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })

  describe("UpdateOrder", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha: oldSha,
    })

    it("Renaming a subcollection works correctly", async () => {
      const newOrder = [
        `${fileName}2.md`,
        `${subcollectionName}/.keep`,
        `${subcollectionName}/${subcollectionFileName}2.md`,
        `${subcollectionName}/${subcollectionFileName}.md`,
        `${fileName}.md`,
      ]
      const modifiedParsedContent = _.cloneDeep(mockParsedContent)
      modifiedParsedContent.collections[collectionName].order = newOrder
      const modifiedRawContent = yaml.stringify(modifiedParsedContent)
      await expect(
        service.updateOrder(reqDetails, {
          collectionName,
          newOrder,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: COLLECTION_FILE_NAME,
        directoryName,
        fileContent: modifiedRawContent,
        sha: oldSha,
      })
    })
  })
})
