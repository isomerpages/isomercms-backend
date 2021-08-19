const { CollectionController } = require("@controllers/CollectionController")

describe("Collection Controller", () => {
  const mockCollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  }

  const mockSubcollectionPageService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
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
      await controller.createPage(reqDetails, {
        fileName,
        collectionName,
        content,
        frontMatter,
      })
      expect(mockCollectionPageService.create).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, content, frontMatter }
      )
    })

    it("Routes page creation to subcollection page service correctly", async () => {
      await controller.createPage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
      })
      expect(mockSubcollectionPageService.create).toHaveBeenCalledWith(
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
      await controller.readPage(reqDetails, { fileName, collectionName })
      expect(mockCollectionPageService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        collectionName,
      })
    })

    it("Routes page reading to subcollection page service correctly", async () => {
      await controller.readPage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
      })
      expect(mockSubcollectionPageService.read).toHaveBeenCalledWith(
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
      await controller.updatePage(reqDetails, {
        fileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockCollectionPageService.update).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, content, frontMatter, sha }
      )
    })

    it("Routes page renaming to collection page service correctly", async () => {
      await controller.updatePage(reqDetails, {
        fileName,
        newFileName,
        collectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockCollectionPageService.rename).toHaveBeenCalledWith(
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
      await controller.updatePage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockSubcollectionPageService.update).toHaveBeenCalledWith(
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
      await controller.updatePage(reqDetails, {
        fileName,
        newFileName,
        collectionName,
        subcollectionName,
        content,
        frontMatter,
        sha,
      })
      expect(mockSubcollectionPageService.rename).toHaveBeenCalledWith(
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
      await controller.deletePage(reqDetails, { fileName, collectionName, sha })
      expect(mockCollectionPageService.delete).toHaveBeenCalledWith(
        reqDetails,
        { fileName, collectionName, sha }
      )
    })

    it("Routes page deletion to subcollection page service correctly", async () => {
      await controller.deletePage(reqDetails, {
        fileName,
        collectionName,
        subcollectionName,
        sha,
      })
      expect(mockSubcollectionPageService.delete).toHaveBeenCalledWith(
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
