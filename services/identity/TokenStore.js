const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager")

class TokenStore {
  constructor() {
    this.client = this.createClient()
  }

  createClient() {
    const { AWS_REGION, AWS_ENDPOINT } = process.env
    const config = { region: AWS_REGION || "ap-southeast-1" }
    // Use an alternate AWS endpoint if provided. For testing with localstack
    if (AWS_ENDPOINT) config.endpoint = AWS_ENDPOINT

    return new SecretsManagerClient(config)
  }

  async getToken(apiTokenName) {
    const command = new GetSecretValueCommand({
      SecretId: apiTokenName,
    })
    const { SecretString: apiToken } = await this.client.send(command)
    return apiToken
  }
}

module.exports = TokenStore
