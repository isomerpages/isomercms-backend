const { CollectionController } = require("../CollectionController")

describe("Collection Controller", () => {
  const mockCollectionPageService = {
    Create: jest.fn(),
    Read: jest.fn(),
    Update: jest.fn(),
    Delete: jest.fn(),
    Rename: jest.fn(),
  }

  const mockSubcollectionPageService = {
    Create: jest.fn(),
    Read: jest.fn(),
    Update: jest.fn(),
    Delete: jest.fn(),
    Rename: jest.fn(),
  }

  const controller = new CollectionController({
    collectionPageService: mockCollectionPageService,
    subcollectionPageService: mockSubcollectionPageService,
  })

  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const content = "test"
  const frontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const reqDetails = { siteName, accessToken }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("CreatePage", () => {
    it("Routes page creation to collection page service correctly", async () => {
      await controller.CreatePage(reqDetails, {
        fileName,
        collectionName,
        content,
        frontMatter,
      })
      expect(mockCollectionPageService.Create).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, content, frontMatter }
      )
    })

    it("Routes page creation to subcollection page service correctly", async () => {
      await controller.CreatePage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
      })
      expect(mockSubcollectionPageService.Create).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName,
          subcollectionName,
          content,
          frontMatter,
        }
      )
    })
  })

  describe("ReadPage", () => {
    it("Routes page reading to collection page service correctly", async () => {
      await controller.ReadPage(reqDetails, { fileName, collectionName })
      expect(mockCollectionPageService.Read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
      })
    })

    it("Routes page reading to subcollection page service correctly", async () => {
      await controller.ReadPage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
      })
      expect(mockSubcollectionPageService.Read).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName,
          subcollectionName,
        }
      )
    })
  })

  describe("UpdatePage", () => {
    const newFileName = "test-new-file"
    it("Routes page modification to collection page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockCollectionPageService.Update).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, content, frontMatter, sha }
      )
    })

    it("Routes page renaming to collection page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        newFileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockCollectionPageService.Rename).toHaveBeenCalledWith(
        reqDetails,
        {
          oldFileName: fileName,
          newFileName,
          collectionName,
          content,
          frontMatter,
          sha,
        }
      )
    })

    it("Routes page modification to subcollection page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockSubcollectionPageService.Update).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName,
          subcollectionName,
          content,
          frontMatter,
          sha,
        }
      )
    })

    it("Routes page renaming to subcollection page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        newFileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockSubcollectionPageService.Rename).toHaveBeenCalledWith(
        reqDetails,
        {
          oldFileName: fileName,
          newFileName,
          collectionName,
          subcollectionName,
          content,
          frontMatter,
          sha,
        }
      )
    })
  })

  describe("DeletePage", () => {
    it("Routes page deletion to collection page service correctly", async () => {
      await controller.DeletePage(reqDetails, { fileName, collectionName, sha })
      expect(mockCollectionPageService.Delete).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, sha }
      )
    })

    it("Routes page deletion to subcollection page service correctly", async () => {
      await controller.DeletePage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        sha,
      })
      expect(mockSubcollectionPageService.Delete).toHaveBeenCalledWith(
        reqDetails,
        {
          fileName,
          collectionName,
          subcollectionName,
          sha,
        }
      )
    })
  })
})
