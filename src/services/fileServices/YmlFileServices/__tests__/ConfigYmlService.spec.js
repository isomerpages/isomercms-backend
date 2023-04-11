const {
  configContent: mockConfigContent,
  configSha: mockConfigSha,
  rawConfigContent: mockRawConfigContent,
} = require("@fixtures/config")

const { ConfigYmlService } = require("../ConfigYmlService")

describe("Config Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const sessionData = { siteName, accessToken }

  const CONFIG_FILE_NAME = "_config.yml"

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
  }

  const service = new ConfigYmlService({
    gitHubService: mockGithubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValueOnce({
      content: mockRawConfigContent,
      sha: mockConfigSha,
    })
    it("Reading the _config.yml file works correctly", async () => {
      await expect(service.read(sessionData)).resolves.toMatchObject({
        content: mockConfigContent,
        sha: mockConfigSha,
      })
      expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
        fileName: CONFIG_FILE_NAME,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: mockConfigSha })
    it("Updating _config.yml file works correctly", async () => {
      await expect(
        service.update(sessionData, {
          fileContent: mockConfigContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: mockConfigSha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
        fileName: CONFIG_FILE_NAME,
        fileContent: mockRawConfigContent,
        sha: oldSha,
      })
    })
  })
})
