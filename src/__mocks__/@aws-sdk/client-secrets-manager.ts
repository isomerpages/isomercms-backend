// This is a manual module mock for the AWS client.
// This is done to prevent our internal services from pinging the actual AWS ones
// and to ensure our tests are 1. consistent 2. reliable.

export const mockSend = jest.fn()

export const secretsManagerClient = {
  send: mockSend,
}

export const SecretsManagerClient: jest.Mock<
  typeof secretsManagerClient
> = jest.fn().mockImplementation(() => secretsManagerClient)

export const GetSecretValueCommand = jest.fn((secret) => ({ SecretId: secret }))
