const {
  configContent: mockConfigContent,
  configSha: mockConfigSha,
  rawConfigContent: mockRawConfigContent,
} = require("../../../../fixtures/config")
const { ConfigYmlService } = require("../ConfigYmlService")

describe("Config Yml Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const reqDetails = { siteName, accessToken }

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
      await expect(service.read(reqDetails)).resolves.toMatchObject({
        content: mockConfigContent,
        sha: mockConfigSha,
      })
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: CONFIG_FILE_NAME,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: mockConfigSha })
    it("Updating _config.yml file works correctly", async () => {
      await expect(
        service.update(reqDetails, {
          fileContent: mockConfigContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        newSha: mockConfigSha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: CONFIG_FILE_NAME,
        fileContent: mockRawConfigContent,
        sha: oldSha,
      })
    })
  })
})
