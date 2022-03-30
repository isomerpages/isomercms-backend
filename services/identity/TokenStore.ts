import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerClientConfig,
} from "@aws-sdk/client-secrets-manager"

class TokenStore {
  private readonly secretsClient: SecretsManagerClient

  constructor() {
    this.secretsClient = this.createClient()
  }

  private createClient() {
    const { AWS_REGION, AWS_ENDPOINT } = process.env
    const config: SecretsManagerClientConfig = {
      region: AWS_REGION || "ap-southeast-1",
    }

    // Use an alternate AWS endpoint if provided. For testing with localstack
    if (AWS_ENDPOINT) config.endpoint = AWS_ENDPOINT

    return new SecretsManagerClient(config)
  }

  // NOTE: This is currently stricter than required.
  // We can relax the constraint so that it can be undefined in the future.
  async getToken(apiTokenName: string): Promise<string | undefined> {
    const command = new GetSecretValueCommand({
      SecretId: apiTokenName,
    })
    const { SecretString: apiToken } = await this.secretsClient.send(command)
    return apiToken
  }
}

export default TokenStore
