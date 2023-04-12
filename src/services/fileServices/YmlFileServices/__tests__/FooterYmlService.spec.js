const {
  footerContent: mockFooterContent,
  footerSha: mockFooterSha,
  rawFooterContent: mockRawFooterContent,
} = require("@fixtures/footer")

const { FooterYmlService } = require("../FooterYmlService")

describe("Footer Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const sessionData = { siteName, accessToken }

  const FOOTER_FILE_NAME = "footer.yml"
  const FOOTER_FILE_DIR = "_data"

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
  }

  const service = new FooterYmlService({
    gitHubService: mockGithubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawFooterContent,
      sha: mockFooterSha,
    })
    it("Reading the _data/footer.yml file works correctly", async () => {
      await expect(service.read(sessionData)).resolves.toMatchObject({
        content: mockFooterContent,
        sha: mockFooterSha,
      })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName: FOOTER_FILE_NAME,
        directoryName: FOOTER_FILE_DIR,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: mockFooterSha })
    it("Updating _data/footer.yml file works correctly", async () => {
      await expect(
        service.update(sessionData, {
          fileContent: mockFooterContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: mockFooterSha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName: FOOTER_FILE_NAME,
        directoryName: FOOTER_FILE_DIR,
        fileContent: mockRawFooterContent,
        sha: oldSha,
      })
    })
  })
})
