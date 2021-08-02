const { CollectionController } = require("../CollectionController")

describe("Collection Controller", () => {
  const mockCollectionPageService = {
    Create: jest.fn(),
    Read: jest.fn(),
    Update: jest.fn(),
    Delete: jest.fn(),
    Rename: jest.fn(),
  }

  const mockThirdNavPageService = {
    Create: jest.fn(),
    Read: jest.fn(),
    Update: jest.fn(),
    Delete: jest.fn(),
    Rename: jest.fn(),
  }

  const controller = new CollectionController({
    collectionPageService: mockCollectionPageService,
    thirdNavPageService: mockThirdNavPageService,
  })

  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const collectionName = "collection"
  const thirdNavTitle = "subcollection"
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

    it("Routes page creation to third nav page service correctly", async () => {
      await controller.CreatePage(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
      })
      expect(mockThirdNavPageService.Create).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
      })
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

    it("Routes page reading to third nav page service correctly", async () => {
      await controller.ReadPage(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
      })
      expect(mockThirdNavPageService.Read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
      })
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

    it("Routes page modification to third nav page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
        sha,
      })
      expect(mockThirdNavPageService.Update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
        sha,
      })
    })

    it("Routes page renaming to third nav page service correctly", async () => {
      await controller.UpdatePage(reqDetails, {
        fileName,
        newFileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
        sha,
      })
      expect(mockThirdNavPageService.Rename).toHaveBeenCalledWith(reqDetails, {
        oldFileName: fileName,
        newFileName,
        collectionName,
        thirdNavTitle,
        content,
        frontMatter,
        sha,
      })
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

    it("Routes page deletion to third nav page service correctly", async () => {
      await controller.DeletePage(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        sha,
      })
      expect(mockThirdNavPageService.Delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
        thirdNavTitle,
        sha,
      })
    })
  })
})
