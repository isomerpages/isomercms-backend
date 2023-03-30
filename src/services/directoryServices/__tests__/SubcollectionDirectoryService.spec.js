const { BadRequestError } = require("@errors/BadRequestError")

const PLACEHOLDER_FILE_NAME = ".keep"

describe("Subcollection Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const collectionName = "collection"
  const subcollectionName = "Subcollection name"
  const mockGithubSessionData = "mockData"

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
    delete: jest.fn(),
  }

  const mockCollectionYmlService = {
    listContents: jest.fn(),
    addItemToOrder: jest.fn(),
    renameSubfolderInOrder: jest.fn(),
    deleteSubfolderFromOrder: jest.fn(),
    updateOrder: jest.fn(),
  }

  const mockMoverService = {
    movePage: jest.fn(),
  }

  const mockSubcollectionPageService = {
    updateSubcollection: jest.fn(),
  }

  const mockGitHubService = {
    create: jest.fn(),
    delete: jest.fn(),
  }

  const {
    SubcollectionDirectoryService,
  } = require("@services/directoryServices/SubcollectionDirectoryService")
  const service = new SubcollectionDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    collectionYmlService: mockCollectionYmlService,
    moverService: mockMoverService,
    subcollectionPageService: mockSubcollectionPageService,
    gitHubService: mockGitHubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ListFiles", () => {
    const listResp = [
      "testfile",
      "testfile1",
      `${subcollectionName}/.keep`,
      `${subcollectionName}/file1`,
      `${subcollectionName}/file2`,
      "testfile2",
    ]
    const expectedResp = [
      {
        name: "file1",
        type: "file",
      },
      {
        name: "file2",
        type: "file",
      },
    ]
    mockCollectionYmlService.listContents.mockResolvedValueOnce(listResp)
    it("ListFiles returns all files properly formatted", async () => {
      await expect(
        service.listFiles(reqDetails, { collectionName, subcollectionName })
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
    const parsedDir = `_${collectionName}/${subcollectionName}`
    it("rejects subcollection names with special characters", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
          subcollectionName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Creating a directory with no specified files works correctly", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
          subcollectionName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: subcollectionName,
        items: [],
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: parsedDir,
      })
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          item: `${subcollectionName}/${PLACEHOLDER_FILE_NAME}`,
        }
      )
    })

    it("Creating a directory with specified files works correctly", async () => {
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
          subcollectionName,
          objArray,
        })
      ).resolves.toMatchObject({
        newDirectoryName: subcollectionName,
        items: objArray,
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: parsedDir,
      })
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          item: `${subcollectionName}/${PLACEHOLDER_FILE_NAME}`,
        }
      )
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          newFileCollection: collectionName,
          newFileSubcollection: subcollectionName,
        })
      })
    })

    it("Creating a directory deslugifies the title", async () => {
      const originalTitle = `hEllo there`
      const expectedTitle = `HEllo there`
      await expect(
        service.createDirectory(reqDetails, {
          collectionName,
          subcollectionName: originalTitle,
          objArray,
        })
      ).resolves.toMatchObject({
        newDirectoryName: expectedTitle,
        items: objArray,
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: `_${collectionName}/${expectedTitle}`,
      })
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          item: `${expectedTitle}/${PLACEHOLDER_FILE_NAME}`,
        }
      )
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          newFileCollection: collectionName,
          newFileSubcollection: expectedTitle,
        })
      })
    })
  })

  describe("RenameDirectory", () => {
    const dir = `_${collectionName}/${subcollectionName}`
    const readDirResp = [
      {
        name: "test-name",
        path: "test-name",
        sha: "12345",
        size: 10,
        type: "file",
      },
      {
        name: "test-name2",
        path: "test-name2",
        sha: "12345",
        size: 10,
        type: "file",
      },
      {
        name: PLACEHOLDER_FILE_NAME,
        path: PLACEHOLDER_FILE_NAME,
        sha: "test-sha",
        size: 10,
        type: "file",
      },
    ]

    it("rejects subcollection names with special characters", async () => {
      await expect(
        service.renameDirectory(reqDetails, {
          collectionName,
          subcollectionName,
          newDirectoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Renaming a subcollection works correctly", async () => {
      const newDirectoryName = "New Dir"
      mockBaseDirectoryService.list.mockResolvedValueOnce(readDirResp)
      await expect(
        service.renameDirectory(reqDetails, {
          collectionName,
          subcollectionName,
          newDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: dir,
      })
      readDirResp.forEach((file) => {
        if (file.name === PLACEHOLDER_FILE_NAME) {
          expect(mockGitHubService.delete).toHaveBeenCalledWith(reqDetails, {
            sha: file.sha,
            fileName: file.name,
            directoryName: dir,
          })
        } else {
          expect(
            mockSubcollectionPageService.updateSubcollection
          ).toHaveBeenCalledWith(reqDetails, {
            fileName: file.name,
            collectionName,
            oldSubcollectionName: subcollectionName,
            newSubcollectionName: newDirectoryName,
          })
        }
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: `_${collectionName}/${newDirectoryName}`,
      })
      expect(
        mockCollectionYmlService.renameSubfolderInOrder(reqDetails, {
          collectionName,
          oldSubfolder: subcollectionName,
          newSubfolder: newDirectoryName,
        })
      )
    })

    it("Renaming a subcollection slugifies the title correctly", async () => {
      const originalTitle = `hEllo there`
      const expectedTitle = `HEllo there`
      mockBaseDirectoryService.list.mockResolvedValueOnce(readDirResp)
      await expect(
        service.renameDirectory(reqDetails, {
          collectionName,
          subcollectionName,
          newDirectoryName: originalTitle,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: dir,
      })
      readDirResp.forEach((file) => {
        if (file.name === PLACEHOLDER_FILE_NAME) {
          expect(mockGitHubService.delete).toHaveBeenCalledWith(reqDetails, {
            sha: file.sha,
            fileName: file.name,
            directoryName: dir,
          })
        } else {
          expect(
            mockSubcollectionPageService.updateSubcollection
          ).toHaveBeenCalledWith(reqDetails, {
            fileName: file.name,
            collectionName,
            oldSubcollectionName: subcollectionName,
            newSubcollectionName: expectedTitle,
          })
        }
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: `_${collectionName}/${expectedTitle}`,
      })
      expect(
        mockCollectionYmlService.renameSubfolderInOrder(reqDetails, {
          collectionName,
          oldSubfolder: subcollectionName,
          newSubfolder: expectedTitle,
        })
      )
    })
  })

  describe("DeleteDirectory", () => {
    it("Deleting a directory works correctly", async () => {
      await expect(
        service.deleteDirectory(reqDetails, mockGithubSessionData, {
          collectionName,
          subcollectionName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(
        reqDetails,
        mockGithubSessionData,
        {
          directoryName: `_${collectionName}/${subcollectionName}`,
          message: `Deleting subcollection ${collectionName}/${subcollectionName}`,
        }
      )
      expect(
        mockCollectionYmlService.deleteSubfolderFromOrder
      ).toHaveBeenCalledWith(reqDetails, {
        collectionName,
        subfolder: subcollectionName,
      })
    })
  })

  describe("ReorderDirectory", () => {
    const listResp = [
      "testfile",
      "testfile1",
      `${subcollectionName}/.keep`,
      `${subcollectionName}/file1`,
      `${subcollectionName}/file2`,
      "testfile2",
    ]
    const expectedNewOrder = [
      "testfile",
      "testfile1",
      `${subcollectionName}/.keep`,
      `${subcollectionName}/file2`,
      `${subcollectionName}/file1`,
      "testfile2",
    ]
    const newObjArray = [
      {
        name: "file2",
        type: "file",
      },
      {
        name: "file1",
        type: "file",
      },
    ]
    mockCollectionYmlService.listContents.mockResolvedValueOnce(listResp)
    it("Reordering a directory works correctly", async () => {
      await expect(
        service.reorderDirectory(reqDetails, {
          collectionName,
          subcollectionName,
          objArray: newObjArray,
        })
      ).resolves.toMatchObject(newObjArray)
      expect(mockCollectionYmlService.updateOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          newOrder: expectedNewOrder,
        }
      )
    })
  })

  describe("MovePages", () => {
    const targetCollectionName = "target-collection"
    const targetSubcollectionName = "target-subcollection"
    it("Moving pages in a subcollection to unlinked pages works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          subcollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          oldFileSubcollection: subcollectionName,
        })
      })
    })
    it("Moving pages in a subcollection to a collection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          subcollectionName,
          targetCollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          oldFileSubcollection: subcollectionName,
          newFileCollection: targetCollectionName,
        })
      })
    })
    it("Moving pages in a subcollection to another subcollection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          collectionName,
          subcollectionName,
          targetCollectionName,
          targetSubcollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          oldFileCollection: collectionName,
          oldFileSubcollection: subcollectionName,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    })
  })
})
