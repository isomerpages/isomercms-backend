const axios = require("axios")
const { Base64 } = require("js-base64")

const validateStatus = require("@utils/axios-utils")

const {
  netlifyTomlContent,
  netlifyTomlHeaderValues,
} = require("@root/fixtures/netlifyToml")

const { GITHUB_BUILD_ORG_NAME, GITHUB_BUILD_REPO_NAME } = process.env

jest.mock("axios")

describe("Auth Service", () => {
  const accessToken = "test-token"

  const reqDetails = { accessToken }

  const {
    NetlifyTomlService,
  } = require("@services/configServices/NetlifyTomlService")

  const service = new NetlifyTomlService()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("read", () => {
    it("Reading the netlify.toml file works correctly", async () => {
      axios.get.mockImplementation(() => ({
        data: {
          content: Base64.encode(netlifyTomlContent),
        },
      }))

      await expect(service.read(reqDetails)).resolves.toEqual(
        netlifyTomlHeaderValues
      )

      expect(axios.get).toHaveBeenCalledWith(
        `https://api.github.com/repos/${GITHUB_BUILD_ORG_NAME}/${GITHUB_BUILD_REPO_NAME}/contents/overrides/netlify.toml`,
        {
          validateStatus,
          headers: {
            Authorization: `token ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
    })
  })
})
