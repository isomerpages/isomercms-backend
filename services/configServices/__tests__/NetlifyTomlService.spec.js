const axios = require("axios")
const { Base64 } = require("js-base64")

const validateStatus = require("@utils/axios-utils")

const {
  netlifyTomlContent,
  netlifyTomlHeaderValues,
} = require("@root/fixtures/netlifyToml")

const { GITHUB_BUILD_ORG_NAME, GITHUB_BUILD_REPO_NAME } = process.env

jest.mock("axios")

describe("NetlifyToml Service", () => {
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
    it("should read successfully when the netlify.toml is valid", async () => {
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
