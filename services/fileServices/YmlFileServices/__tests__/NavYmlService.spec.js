const { deslugifyCollectionName } = require("@utils/utils")

const {
  NavYmlService,
} = require("@services/fileServices/YmlFileServices/NavYmlService")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

const yaml = require("yaml")
const _ = require("lodash")

describe("Nav Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = NAV_FILE_NAME
  const collectionName = "collection"
  const directoryName = NAV_FILE_DIR
  const sha = "12345"

  const reqDetails = { siteName, accessToken }
  const mockParsedContent = {
    links: [
      {
        title: "Page",
        url: "/page/",
      },
      {
        title: "Resource room",
        resource_room: true,
      },
      {
        title: "Collection 1",
        collection: collectionName,
      },
      {
        title: "Collection 2",
        collection: "extra-collection",
      },
      {
        title: "Menu",
        url: `/menu`,
        sublinks: [
          {
            title: "Submenu",
            url: "/submenu",
          },
          {
            title: "Submenu 2",
            url: "/submenu-2",
          },
        ],
      },
      {
        title: "Page 2",
        url: "/page-2/",
      },
    ],
  }
  const mockRawContent = yaml.stringify(mockParsedContent)

  const mockGithubService = {
    read: jest.fn(),
    update: jest.fn(),
  }

  const service = new NavYmlService({
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
      it("Reading the navigation.yml file works correctly", async () => {
        await expect(service.read(reqDetails)).resolves.toMatchObject({
          content: mockParsedContent,
          sha,
        })
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName,
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
          fileContent: mockParsedContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: mockRawContent,
        sha: oldSha,
      })
    })
  })

  describe("createCollectionInNav", () => {
    const newSha = "54321"
    const newCollection = `new-collection`
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha,
    })
    const updatedMockParsedContent = {
      links: mockParsedContent.links.concat({
        title: deslugifyCollectionName(newCollection),
        collection: newCollection,
      }),
    }
    mockGithubService.update.mockResolvedValueOnce({ newSha })
    it("Adds new collections to the end of the navigation file and returns the new sha", async () => {
      await expect(
        service.createCollectionInNav(reqDetails, {
          collectionName: newCollection,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: yaml.stringify(updatedMockParsedContent),
        sha,
      })
    })
  })

  describe("renameCollectionInNav", () => {
    const newSha = "54321"
    const newCollection = `new-collection`
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha,
    })
    const updatedMockParsedContent = {
      links: mockParsedContent.links.map((link) => {
        if (link.collection === collectionName) {
          return {
            title: deslugifyCollectionName(newCollection),
            collection: newCollection,
          }
        }
        return link
      }),
    }
    mockGithubService.update.mockResolvedValueOnce({ newSha })
    it("Adds new collections to the end of the navigation file and returns the new sha", async () => {
      await expect(
        service.renameCollectionInNav(reqDetails, {
          oldCollectionName: collectionName,
          newCollectionName: newCollection,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: yaml.stringify(updatedMockParsedContent),
        sha,
      })
    })
  })

  describe("deleteCollectionInNav", () => {
    const newSha = "54321"
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawContent,
      sha,
    })
    const updatedMockParsedContent = {
      links: mockParsedContent.links.filter(
        (link) => link.collection !== collectionName
      ),
    }
    mockGithubService.update.mockResolvedValueOnce({ newSha })
    it("Removes selected collection from navigation file", async () => {
      await expect(
        service.deleteCollectionInNav(reqDetails, {
          collectionName,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: yaml.stringify(updatedMockParsedContent),
        sha,
      })
    })
  })
})
