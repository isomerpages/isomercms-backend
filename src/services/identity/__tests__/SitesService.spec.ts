import { ModelStatic } from "sequelize"

import { Site } from "@database/models"

import _SitesService from "../SitesService"
import TokenStore from "../TokenStore"

const MockRepository = {
  findOne: jest.fn(),
}

const MockTokenStore = {
  getToken: jest.fn(),
}

const SitesService = new _SitesService({
  repository: (MockRepository as unknown) as ModelStatic<Site>,
  tokenStore: (MockTokenStore as unknown) as TokenStore,
})

const mockSiteToken = "token black"
const mockSiteName = "some site name"
const mockSite = ({
  name: "i m a site",
  apiTokenName: "0000",
  users: [],
} as unknown) as Site

describe("SitesService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  it("should call the findOne method of the db model to get the siteName", async () => {
    // Arrange
    const expected = mockSite
    MockRepository.findOne.mockResolvedValue(mockSite)

    // Act
    const actual = await SitesService.getBySiteName(mockSiteName)

    // Assert
    expect(actual).toBe(expected)
    expect(MockRepository.findOne).toBeCalledWith({
      where: {
        name: mockSiteName,
      },
    })
  })

  it("should call the underlying getToken method of the token store when the site exists", async () => {
    // Arrange
    const expected = mockSiteToken
    const getSpy = jest.spyOn(SitesService, "getBySiteName")
    getSpy.mockResolvedValueOnce(mockSite)
    MockTokenStore.getToken.mockResolvedValue(mockSiteToken)

    // Act
    const actual = await SitesService.getSiteAccessToken(mockSiteName)

    // Assert
    expect(actual).toBe(expected)
    expect(getSpy).toBeCalledWith(mockSiteName)
    expect(MockTokenStore.getToken).toBeCalledWith(mockSite.apiTokenName)
  })

  it("should return null when there is no site with siteName", async () => {
    // Arrange
    const getSpy = jest.spyOn(SitesService, "getBySiteName")
    getSpy.mockResolvedValueOnce(null)

    // Act
    const actual = await SitesService.getSiteAccessToken(mockSiteName)

    // Assert
    expect(actual).toBeNull()
    expect(MockTokenStore.getToken).not.toBeCalled()
  })
})
