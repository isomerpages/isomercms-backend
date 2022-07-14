import {
  secretsManagerClient as mockSecretsManager,
  GetSecretValueCommand,
} from "@mocks/@aws-sdk/client-secrets-manager"

import _TokenStore from "../TokenStore"

const apiTokenName = "some token"
const TokenStore = new _TokenStore()

describe("Token Store", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    mockSecretsManager.send.mockClear()
  })

  it("should return the api token when the parameters are valid", async () => {
    // Arrange
    const expected = "some api"
    const awsCommand = new GetSecretValueCommand({
      SecretId: apiTokenName,
    })
    mockSecretsManager.send.mockResolvedValueOnce({ SecretString: expected })

    // Act
    const actual = await TokenStore.getToken(apiTokenName)

    // Assert
    expect(actual).toBe(expected)
    expect(mockSecretsManager.send).toHaveBeenCalledWith(awsCommand)
  })

  it("should return the error when the secrets client fails to retrieve credentials", () => {
    // Arrange
    const expected = Error("oh noes")
    const awsCommand = new GetSecretValueCommand({
      SecretId: apiTokenName,
    })
    mockSecretsManager.send.mockRejectedValueOnce(expected)

    // Act
    const actual = TokenStore.getToken(apiTokenName)

    // Assert
    expect(actual).rejects.toBe(expected)
    expect(mockSecretsManager.send).toHaveBeenCalledWith(awsCommand)
  })
})
