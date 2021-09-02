const { ConflictError } = require("@errors/ConflictError")

describe("Collection Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const collectionName = "collection"

  const objArray = [
    {
      type: "file",
      name: "file.md",
    },
    {
      type: "file",
      name: `file2.md`,
    },
  ]

  const reqDetails = { siteName, accessToken }

  const mockBaseDirectoryService = {
    list: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn(),
  }

  const mockNavYmlService = {
    renameCollectionInNav: jest.fn(),
    deleteCollectionInNav: jest.fn(),
  }

  const mockCollectionYmlService = {
    listContents: jest.fn(),
    create: jest.fn(),
    renameCollectionInOrder: jest.fn(),
    updateOrder: jest.fn(),
  }

  const mockMoverService = {
    movePage: jest.fn(),
  }

  const {
    CollectionDirectoryService,
  } = require("@services/directoryServices/CollectionDirectoryService")
  const service = new CollectionDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    navYmlService: mockNavYmlService,
    collectionYmlService: mockCollectionYmlService,
    moverService: mockMoverService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ListAllCollections", () => {
    const listResp = [
      {
        name: "test-name",
        path: "test-name",
        sha: "test-sha0",
        size: 10,
        type: "file",
      },
      {
        name: "test-name2",
        path: "test-name2",
        sha: "test-sha",
        size: 10,
        type: "file",
      },
      {
        name: "_data",
        path: "_data",
        sha: "test-sha2",
        size: 10,
        type: "dir",
      },
      {
        name: "_test-col",
        path: "_test-col",
        sha: "test-sha3",
        size: 10,
        type: "dir",
      },
      {
        name: "_test-col2",
        path: "_test-col2",
        sha: "test-sha4",
        size: 10,
        type: "dir",
      },
    ]
    const expectedResp = [
      {
        name: "test-col",
        type: "dir",
      },
      {
        name: "test-col2",
        type: "dir",
      },
    ]
    mockBaseDirectoryService.list.mockResolvedValueOnce(listResp)
    it("Listing collections only returns collections and not protected folders", async () => {
      await expect(
        service.listAllCollections(reqDetails)
      ).resolves.toMatchObject(expectedResp)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: "",
      })
    })
  })

  describe("ListFiles", () => {
    const listResp = [
      "testfile",
      "testfile1",
      "testsub/.keep",
      "testsub/file1",
      "testsub/file2",
      "testfile2",
    ]
    const expectedResp = [
      {
        name: "testfile",
        type: "file",
      },
      {
        name: "testfile1",
        type: "file",
      },
      {
        name: "testsub",
        type: "dir",
        children: ["file1", "file2"],
      },
      {
        name: "testfile2",
        type: "file",
      },
    ]
    mockCollectionYmlService.listContents.mockResolvedValueOnce(listResp)
    it("ListFiles returns all files and collections properly formatted", async () => {
      await expect(
        service.listFiles(reqDetails, { collectionName })
      ).resolves.toMatchObject(expectedResp)
      expect(mockCollectionYmlService.listContents).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
        }
      )
    })
  })

  describe("CreateDirectory", () => {
    it("rejects collections with the same name as protected folders", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName: "data",
        })
      ).rejects.toThrowError(ConflictError)
    })

    it("Creating a directory with no specified files works correctly", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
        })
      ).resolves.toMatchObject([])
      expect(mockCollectionYmlService.create).toHaveBeenCalledWith(reqDetails, {
        collectionName,
      })
    })

    it("Creating a directory with specified files works correctly", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
          objArray,
        })
      ).resolves.toMatchObject(objArray)
      expect(mockCollectionYmlService.create).toHaveBeenCalledWith(reqDetails, {
        collectionName,
      })
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          newFileCollection: collectionName,
        })
      })
    })
  })

  describe("RenameDirectory", () => {
    const newDirectoryName = "new-dir"
    it("rejects renaming to a collection with the same name as protected folders", async () => {
      await expect(
        service.renameDirectory(reqDetails, {
          collectionName,
          newDirectoryName: "files",
        })
      ).rejects.toThrowError(ConflictError)
    })

    it("Renaming a collection works correctly", async () => {
      await expect(
        service.renameDirectory(reqDetails, {
          collectionName,
          newDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: `_${collectionName}`,
        newDirectoryName: `_${newDirectoryName}`,
        message: `Renaming collection ${collectionName} to ${newDirectoryName}`,
      })
      expect(
        mockCollectionYmlService.renameCollectionInOrder
      ).toHaveBeenCalledWith(reqDetails, {
        oldCollectionName: collectionName,
        newCollectionName: newDirectoryName,
      })
      expect(mockNavYmlService.renameCollectionInNav).toHaveBeenCalledWith(
        reqDetails,
        {
          oldCollectionName: collectionName,
          newCollectionName: newDirectoryName,
        }
      )
    })
  })

  describe("DeleteDirectory", () => {
    it("rejects deleting a collection with the same name as protected folders", async () => {
      await expect(
        service.deleteDirectory(reqDetails, {
          collectionName: "data",
        })
      ).rejects.toThrowError(ConflictError)
    })

    it("Deleting a directory works correctly", async () => {
      await expect(
        service.deleteDirectory(reqDetails, {
          collectionName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(reqDetails, {
        directoryName: `_${collectionName}`,
        message: `Deleting collection ${collectionName}`,
      })
      expect(mockNavYmlService.deleteCollectionInNav).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
        }
      )
    })
  })

  describe("ReorderDirectory", () => {
    it("Reordering a directory works correctly", async () => {
      await expect(
        service.reorderDirectory(reqDetails, {
          collectionName,
          objArray,
        })
      ).resolves.toMatchObject(objArray)
      expect(mockCollectionYmlService.updateOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          newOrder: objArray.map((file) => file.name),
        }
      )
    })
  })

  describe("MovePages", () => {
    const targetCollectionName = "target-collection"
    const targetSubcollectionName = "target-subcollection"
    it("Moving pages in a collection to unlinked pages works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
        })
      })
    })
    it("Moving pages in a collection to another collection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          targetCollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          newFileCollection: targetCollectionName,
        })
      })
    })
    it("Moving pages in a collection to a subcollection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          targetCollectionName,
          targetSubcollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    })
  })
})
