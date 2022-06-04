import { ModelStatic } from "sequelize"

import { Site } from "@database/models"

import _SitesService from "../SitesService"

const MockRepository = {
  findOne: jest.fn(),
}

const SitesService = new _SitesService({
  repository: (MockRepository as unknown) as ModelStatic<Site>,
})

const mockSiteName = "some site name"
const mockSite = ({
  name: "i m a site",
  apiTokenName: "0000",
  users: [],
} as unknown) as Site

describe("SitesService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  it("should call the findOne method of the db model to get the site by name", async () => {
    // Arrange
    const expected = mockSite
    MockRepository.findOne.mockResolvedValue(mockSite)

    // Act
    const actual = await SitesService.getByRepositoryName(mockSiteName)

    // Assert
    expect(actual).toBe(expected)
    expect(MockRepository.findOne).toBeCalledWith({
      where: {
        name: mockSiteName,
      },
    })
  })
})
