describe("Mover Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const oldCollectionName = "old-col"
  const oldSubcollectionName = "old-subcol"
  const collectionName = "collection"
  const subcollectionName = "collection"
  const mockContent = "test"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const mockNewContent = "new test"
  const mockNewFrontMatter = {
    title: "newfileTitle",
    permalink: "file/newpermalink",
  }
  const sha = "12345"

  const reqDetails = { siteName, accessToken }

  const mockUnlinkedPageService = {
    create: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
  }
  const mockCollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
  }
  const mockSubcollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
  }

  const { MoverService } = require("@services/moverServices/MoverService")
  const service = new MoverService({
    unlinkedPageService: mockUnlinkedPageService,
    collectionPageService: mockCollectionPageService,
    subcollectionPageService: mockSubcollectionPageService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("MovePage", () => {
    const createResp = {
      content: { frontMatter: mockNewFrontMatter, pageBody: mockNewContent },
      sha,
    }
    mockUnlinkedPageService.read.mockResolvedValue({
      content: { frontMatter: mockFrontMatter, pageBody: mockContent },
      sha,
    })
    mockUnlinkedPageService.create.mockResolvedValue(createResp)
    mockCollectionPageService.read.mockResolvedValue({
      content: { frontMatter: mockFrontMatter, pageBody: mockContent },
      sha,
    })
    mockCollectionPageService.create.mockResolvedValue(createResp)
    mockSubcollectionPageService.read.mockResolvedValue({
      content: { frontMatter: mockFrontMatter, pageBody: mockContent },
      sha,
    })
    mockSubcollectionPageService.create.mockResolvedValue(createResp)
    it("Moving unlinked page to a collection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          // oldFileCollection,
          // oldFileSubcollection,
          newFileCollection: collectionName,
          // newFileSubcollection,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockUnlinkedPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
      })
      expect(mockUnlinkedPageService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        sha,
      })
      expect(mockCollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
    it("Moving unlinked page to a subcollection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          // oldFileCollection,
          // oldFileSubcollection,
          newFileCollection: collectionName,
          newFileSubcollection: subcollectionName,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockUnlinkedPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
      })
      expect(mockUnlinkedPageService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        sha,
      })
      expect(mockSubcollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          subcollectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
    it("Moving collection page to unlinked pages works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          // oldFileSubcollection,
          // newFileCollection: collectionName,
          // newFileSubcollection,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName: oldCollectionName,
      })
      expect(mockCollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          sha,
        }
      )
      expect(mockUnlinkedPageService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockContent,
        frontMatter: mockFrontMatter,
        fileName,
        shouldIgnoreCheck: true,
      })
    })
    it("Moving collection page to another collection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          // oldFileSubcollection,
          newFileCollection: collectionName,
          // newFileSubcollection,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName: oldCollectionName,
      })
      expect(mockCollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          sha,
        }
      )
      expect(mockCollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
    it("Moving collection page to a subcollection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          // oldFileSubcollection,
          newFileCollection: collectionName,
          newFileSubcollection: subcollectionName,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName: oldCollectionName,
      })
      expect(mockCollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          sha,
        }
      )
      expect(mockSubcollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          subcollectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
    it("Moving subcollection page to unlinked pages works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          oldFileSubcollection: oldSubcollectionName,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
        }
      )
      expect(mockSubcollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
          sha,
        }
      )
      expect(mockUnlinkedPageService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockContent,
        frontMatter: mockFrontMatter,
        fileName,
        shouldIgnoreCheck: true,
      })
    })
    it("Moving subcollection page to a collection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          oldFileSubcollection: oldSubcollectionName,
          newFileCollection: collectionName,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
        }
      )
      expect(mockSubcollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
          sha,
        }
      )
      expect(mockCollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
    it("Moving subcollection page to another subcollection works correctly", async () => {
      await expect(
        service.movePage(reqDetails, {
          fileName,
          oldFileCollection: oldCollectionName,
          oldFileSubcollection: oldSubcollectionName,
          newFileCollection: collectionName,
          newFileSubcollection: subcollectionName,
        })
      ).resolves.toMatchObject(createResp)
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
        }
      )
      expect(mockSubcollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName: oldCollectionName,
          subcollectionName: oldSubcollectionName,
          sha,
        }
      )
      expect(mockSubcollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        {
          content: mockContent,
          frontMatter: mockFrontMatter,
          fileName,
          collectionName,
          subcollectionName,
          shouldIgnoreCheck: true,
        }
      )
    })
  })
})
