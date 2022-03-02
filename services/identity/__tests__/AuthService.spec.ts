import mockAxios from "jest-mock-axios"

import { BadRequestError } from "@root/errors/BadRequestError"

import _AuthService from "../AuthService"

const AuthService = new _AuthService({ axiosClient: mockAxios })
const mockSiteName = "hello world"
const mockUserId = "some user id"
const mockAccessToken = "some token"
const mockHeaders = {
  headers: {
    Authorization: `token ${mockAccessToken}`,
    "Content-Type": "application/json",
  },
}
const mockEndpoint = `/${mockSiteName}/collaborators/${mockUserId}`

describe("Auth Service", () => {
  afterEach(() => mockAxios.reset())

  it("should call axios successfully and return true when the call is successful", async () => {
    // Arrange
    const expected = true
    mockAxios.get.mockResolvedValueOnce({
      response: { status: 200 },
    })

    // Act
    const actual = await AuthService.hasAccessToSite(
      mockSiteName,
      mockUserId,
      mockAccessToken
    )

    // Assert
    expect(actual).toBe(expected)
    expect(mockAxios.get).toHaveBeenCalledWith(mockEndpoint, mockHeaders)
  })

  it("should call axios successfully and return false when the call fails with 403", async () => {
    // Arrange
    const expected = false
    mockAxios.get.mockRejectedValueOnce({
      response: { status: 403 },
      // NOTE: Axios uses this property to determine if it's an axios error
      isAxiosError: true,
    })

    // Act
    const actual = await AuthService.hasAccessToSite(
      mockSiteName,
      mockUserId,
      mockAccessToken
    )

    // Assert
    expect(actual).toBe(expected)
    expect(mockAxios.get).toHaveBeenCalledWith(mockEndpoint, mockHeaders)
  })

  it("should call axios successfully and return false when the call fails with 404", async () => {
    // Arrange
    const expected = false
    mockAxios.get.mockRejectedValueOnce({
      response: { status: 404 },
      // NOTE: Axios uses this property to determine if it's an axios error
      isAxiosError: true,
    })

    // Act
    const actual = await AuthService.hasAccessToSite(
      mockSiteName,
      mockUserId,
      mockAccessToken
    )

    // Assert
    expect(actual).toBe(expected)
    expect(mockAxios.get).toHaveBeenCalledWith(mockEndpoint, mockHeaders)
  })

  it("should call axios successfully and bubble the error when the status is not 403 or 404", async () => {
    // Arrange
    const expected = {
      response: { status: 400 },
    }
    mockAxios.get.mockRejectedValueOnce(new BadRequestError(expected))

    // Act
    const actual = AuthService.hasAccessToSite(
      mockSiteName,
      mockUserId,
      mockAccessToken
    )

    // Assert
    expect(actual).rejects.toThrowError(new BadRequestError(expected))
    expect(mockAxios.get).toHaveBeenCalledWith(mockEndpoint, mockHeaders)
  })
})
