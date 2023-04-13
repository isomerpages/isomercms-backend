const { deslugifyCollectionName } = require("@utils/utils")

const {
  navigationContent: mockNavigationContent,
  navigationSha: mockNavigationSha,
  rawNavigationContent: mockRawNavigationContent,
} = require("@fixtures/navigation")
const {
  NavYmlService,
} = require("@services/fileServices/YmlFileServices/NavYmlService")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

const { sanitizedYamlStringify } = require("@utils/yaml-utils")

const _ = require("lodash")

describe("Nav Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = NAV_FILE_NAME
  const collectionName = "collection"
  const directoryName = NAV_FILE_DIR

  const sessionData = { siteName, accessToken }
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
      content: mockRawNavigationContent,
      sha: mockNavigationSha,
    })
    it("Reading the _data/navigation.yml file works correctly", async () => {
      await expect(service.read(sessionData)).resolves.toMatchObject({
        content: mockNavigationContent,
        sha: mockNavigationSha,
      })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName: NAV_FILE_NAME,
        directoryName: NAV_FILE_DIR,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({
      newSha: mockNavigationSha,
    })
    it("Updating _data/navigation.yml file works correctly", async () => {
      await expect(
        service.update(sessionData, {
          fileContent: mockNavigationContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: mockNavigationSha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName: NAV_FILE_NAME,
        directoryName: NAV_FILE_DIR,
        fileContent: mockRawNavigationContent,
        sha: oldSha,
      })
    })
  })

  describe("createCollectionInNav", () => {
    const newSha = "54321"
    const newCollection = `new-collection`
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawNavigationContent,
      sha: mockNavigationSha,
    })
    const updatedMockParsedContent = {
      ...mockNavigationContent,
      links: mockNavigationContent.links.concat({
        title: deslugifyCollectionName(newCollection),
        collection: newCollection,
      }),
    }
    mockGithubService.update.mockResolvedValueOnce({ newSha })
    it("Adds new collections to the end of the navigation file and returns the new sha", async () => {
      await expect(
        service.createCollectionInNav(sessionData, {
          collectionName: newCollection,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        fileContent: sanitizedYamlStringify(updatedMockParsedContent),
        sha: mockNavigationSha,
      })
    })
  })

  describe("renameCollectionInNav", () => {
    const newSha = "54321"
    const newCollection = `new-collection`
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawNavigationContent,
      sha: mockNavigationSha,
    })
    const updatedMockParsedContent = {
      ...mockNavigationContent,
      links: mockNavigationContent.links.map((link) => {
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
        service.renameCollectionInNav(sessionData, {
          oldCollectionName: collectionName,
          newCollectionName: newCollection,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        fileContent: sanitizedYamlStringify(updatedMockParsedContent),
        sha: mockNavigationSha,
      })
    })
  })

  describe("deleteCollectionInNav", () => {
    const newSha = "54321"
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawNavigationContent,
      sha: mockNavigationSha,
    })
    const updatedMockParsedContent = {
      ...mockNavigationContent,
      links: mockNavigationContent.links.filter(
        (link) => link.collection !== collectionName
      ),
    }
    mockGithubService.update.mockResolvedValueOnce({ newSha })
    it("Removes selected collection from navigation file", async () => {
      await expect(
        service.deleteCollectionInNav(sessionData, {
          collectionName,
        })
      ).resolves.toMatchObject({ newSha })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        fileContent: sanitizedYamlStringify(updatedMockParsedContent),
        sha: mockNavigationSha,
      })
    })
  })
})
