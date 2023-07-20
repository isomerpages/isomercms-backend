const { Base64 } = require("js-base64")

const { config } = require("@config/config")

const { validateStatus } = require("@utils/axios-utils")

const {
  mockUserWithSiteSessionData,
  mockAccessToken,
} = require("@fixtures/sessionData")
const {
  netlifyTomlContent,
  netlifyTomlHeaderValues,
} = require("@root/fixtures/netlifyToml")
const {
  genericGitHubAxiosInstance,
} = require("@root/services/api/AxiosInstance")

const GITHUB_BUILD_ORG_NAME = config.get("github.buildOrgName")
const GITHUB_BUILD_REPO_NAME = config.get("github.buildRepo")

describe("NetlifyToml Service", () => {
  const {
    NetlifyTomlService,
  } = require("@services/configServices/NetlifyTomlService")

  const service = new NetlifyTomlService()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("read", () => {
    it("should read successfully when the netlify.toml is valid", async () => {
      genericGitHubAxiosInstance.get.mockImplementation(() => ({
        data: {
          content: Base64.encode(netlifyTomlContent),
        },
      }))

      await expect(service.read(mockUserWithSiteSessionData)).resolves.toEqual(
        netlifyTomlHeaderValues
      )

      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledWith(
        `https://api.github.com/repos/${GITHUB_BUILD_ORG_NAME}/${GITHUB_BUILD_REPO_NAME}/contents/overrides/netlify.toml`,
        {
          validateStatus,
          headers: {
            Authorization: `token ${mockAccessToken}`,
          },
        }
      )
    })
  })
})
