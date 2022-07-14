const UNLINKED_PAGE_DIRECTORY_NAME = "pages"

describe("Unlinked Pages Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"

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
  }

  const mockMoverService = {
    movePage: jest.fn(),
  }

  const {
    UnlinkedPagesDirectoryService,
  } = require("@services/directoryServices/UnlinkedPagesDirectoryService")
  const service = new UnlinkedPagesDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    moverService: mockMoverService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ListAllUnlinkedPages", () => {
    const listResp = [
      {
        name: "test-name",
        path: "pages/test-name",
        sha: "test-sha0",
        size: 10,
        type: "file",
      },
      {
        name: "test-name2",
        path: "pages/test-name2",
        sha: "test-sha",
        size: 10,
        type: "file",
      },
    ]
    const expectedResp = [
      {
        name: "test-name",
        type: "file",
      },
      {
        name: "test-name2",
        type: "file",
      },
    ]
    mockBaseDirectoryService.list.mockResolvedValueOnce(listResp)
    it("Listing all unlinked pages works correctly", async () => {
      await expect(
        service.listAllUnlinkedPages(reqDetails)
      ).resolves.toMatchObject(expectedResp)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: UNLINKED_PAGE_DIRECTORY_NAME,
      })
    })
  })

  describe("MovePages", () => {
    const targetCollectionName = "target-collection"
    const targetSubcollectionName = "target-subcollection"
    it("Moving unlinked pages to a collection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          targetCollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          newFileCollection: targetCollectionName,
        })
      })
    })
    it("Moving unlinked pages to a subcollection works correctly", async () => {
      await expect(
        service.movePages(reqDetails, {
          targetCollectionName,
          targetSubcollectionName,
          objArray,
        })
      ).resolves.not.toThrowError()
      objArray.forEach((file) => {
        expect(mockMoverService.movePage).toHaveBeenCalledWith(reqDetails, {
          fileName: file.name,
          newFileCollection: targetCollectionName,
          newFileSubcollection: targetSubcollectionName,
        })
      })
    })
  })
})
