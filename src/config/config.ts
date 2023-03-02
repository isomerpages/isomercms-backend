import convict from "convict"

require("dotenv").config()

convict.addFormat({
  name: "required-string",
  validate: (val: any) => {
    if (!val) throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "string") throw new Error("value must be a string")
  },
})

convict.addFormat({
  name: "required-number",
  validate: (val: any) => {
    if (!val) throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "number") throw new Error("value must be a number")
  },
  coerce: (val: string) => {
    const coercedVal = Number(val)
    if (coercedVal < 0) {
      throw new Error("value must be a positive number")
    }
    return coercedVal
  },
})

convict.addFormat({
  name: "required-boolean",
  validate: (val: any) => {
    if (val === null || val === undefined)
      throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "boolean") throw new Error("value must be a boolean")
  },
  coerce: (val: string) => String(val).toLowerCase() === "true",
})

// Define a schema
const config = convict({
  env: {
    doc: "The application environment.",
    env: "NODE_ENV",
    format: "required-string",
    default: "LOCAL_DEV",
  },
  gitGuardian: {
    doc: "API Key for GitGuardian pre-commit hooks",
    env: "GITGUARDIAN_API_KEY",
    sensitive: true,
    format: "required-string",
    default: null,
  },
  app: {
    frontendUrl: {
      doc: "URL of the frontend application",
      env: "FRONTEND_URL",
      format: "required-string",
      default: null,
    },
  },
  sites: {
    pageCount: {
      doc: "Number of pages of repos to retrieve from GitHub API",
      env: "ISOMERPAGES_REPO_PAGE_COUNT",
      format: "required-number",
      default: "10",
    },
    localSiteAccessToken: {
      doc: "Access token for local site",
      env: "LOCAL_SITE_ACCESS_TOKEN",
      sensitive: true,
      format: "required-string",
      default: null,
    },
  },
  auth: {
    cookieDomain: {
      doc: "Domain to set for auth cookie",
      env: "COOKIE_DOMAIN",
      format: "required-string",
      default: "localhost",
    },
    tokenExpiry: {
      doc: "Expiry duration for auth token in milliseconds",
      env: "AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS",
      format: "required-number",
      default: 3600000, // 1 hour
    },
    jwtSecret: {
      doc: "Secret used to sign auth tokens",
      env: "JWT_SECRET",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    encryptionSecret: {
      doc: "Secret used to encrypt access GitHub access token",
      env: "ENCRYPTION_SECRET",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    maxNumOtpAttempts: {
      doc: "Maximum number of OTP attempts allowed",
      env: "MAX_NUM_OTP_ATTEMPTS",
      format: "required-number",
      default: 5,
    },
    otpExpiry: {
      doc: "Expiry duration for OTP in milliseconds",
      env: "OTP_EXPIRY",
      format: "required-number",
      default: 900000,
    },
    otpSecret: {
      doc: "Secret used for OTP generation",
      env: "OTP_SECRET",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    domainWhitelist: {
      doc: "List of domains that are allowed to access the API",
      env: "DOMAIN_WHITELIST",
      format: "required-string",
      default: null,
    },
  },
  aws: {
    amplify: {
      region: {
        doc: "AWS region",
        env: "AWS_REGION",
        format: "required-string",
        default: "ap-southeast-1",
      },
      accountNumber: {
        doc: "AWS account number",
        env: "AWS_ACCOUNT_NUMBER",
        sensitive: true,
        format: "required-string",
        default: null,
      },
      accessKeyId: {
        doc: "AWS access key ID",
        env: "AWS_ACCESS_KEY_ID",
        sensitive: true,
        format: "required-string",
        default: null,
      },
      secretAccessKey: {
        doc: "AWS secret access key",
        env: "AWS_SECRET_ACCESS_KEY",
        sensitive: true,
        format: "required-string",
        default: null,
      },
    },
    sqs: {
      incomingQueueUrl: {
        doc: "URL of the incoming SQS queue",
        env: "INCOMING_QUEUE_URL",
        format: "required-string",
        default: null,
      },
      outgoingQueueUrl: {
        doc: "URL of the outgoing SQS queue",
        env: "OUTGOING_QUEUE_URL",
        format: "required-string",
        default: null,
      },
      siteLaunchQueueUrl: {
        doc: "URL of the site launch SQS queue",
        env: "SITE_LAUNCH_QUEUE_URL",
        format: "required-string",
        default: null,
      },
    },
  },
  github: {
    orgName: {
      doc: "GitHub organization that owns all site repositories",
      env: "GITHUB_ORG_NAME",
      format: "required-string",
      default: "isomerpages",
    },
    buildOrgName: {
      doc: "GitHub organization that owns the build repository",
      env: "GITHUB_BUILD_ORG_NAME",
      format: "required-string",
      default: "opengovsg",
    },
    buildRepo: {
      doc: "Name of the build GitHub repository",
      env: "GITHUB_BUILD_REPO_NAME",
      format: "required-string",
      default: "isomer-build",
    },
    clientId: {
      doc: "GitHub OAuth app Client ID",
      env: "CLIENT_ID",
      format: "required-string",
      default: null,
    },
    clientSecret: {
      doc: "GitHub OAuth app Client secret",
      env: "CLIENT_SECRET",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    redirectUri: {
      doc: "URL to redirect to after authentication with GitHub",
      env: "REDIRECT_URI",
      format: "required-string",
      default: null,
    },
    branchRef: {
      doc: "Git branch to use for saving modifications to site",
      env: "BRANCH_REF",
      format: "required-string",
      default: "staging",
    },
    systemToken: {
      doc: "GitHub access token to create repo",
      env: "SYSTEM_GITHUB_TOKEN",
      sensitive: true,
      format: "required-string",
      default: null,
    },
  },
  dataDog: {
    // TODO: To confirm
    env: {
      doc: "The DataDog environment",
      format: ["production", "development", "local"],
      env: "DD_ENV",
      default: "local",
    },
    service: {
      doc: "The DataDog service",
      env: "DD_SERVICE",
      format: "required-string",
      default: null,
    },
    tags: {
      doc: "The DataDog tags",
      env: "DD_TAGS",
      format: "required-string",
      default: null,
    },
  },
  formSg: {
    siteCreateFormKey: {
      doc: "FormSG API key for site creation form",
      env: "SITE_CREATE_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: null,
    },
  },
  postman: {
    apiKey: {
      doc: "Postman API key",
      env: "POSTMAN_API_KEY",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    smsCredName: {
      doc: "Postman SMS credential name",
      env: "POSTMAN_SMS_CRED_NAME",
      format: "required-string",
      default: null,
    },
  },
  cypress: {
    e2eTestRepo: {
      doc: "Name of the e2e test GitHub repository",
      env: "E2E_TEST_REPO",
      format: "required-string",
      default: null,
    },
    e2eTestSecret: {
      doc: "Secret for e2e tests",
      env: "E2E_TEST_SECRET",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    e2eTestGithubToken: {
      doc:
        "GitHub access token for e2e tests. Replace with your own token and make sure the github user is in your local database",
      env: "E2E_TEST_GH_TOKEN",
      sensitive: true,
      format: "required-string",
      default: null,
    },
  },
  database: {
    dbUri: {
      doc: "Database URI",
      env: "DB_URI",
      sensitive: true,
      format: "required-string",
      default: null,
    },
    dbMinPool: {
      // TODO: Using string here as .env has it as a string
      doc: "Minimum number of connections in the pool",
      env: "DB_MIN_POOL",
      format: "required-string",
      default: "1",
    },
    // TODO: Using string here as .env has it as a string
    dbMaxPool: {
      doc: "Maximum number of connections in the pool",
      env: "DB_MAX_POOL",
      format: "required-string",
      default: "10",
    },
    // TODO: confirm this
    dbEnableLogging: {
      doc: "Enable database logging",
      env: "DB_ENABLE_LOGGING",
      format: "required-boolean",
      default: "false",
    },
  },
})

// Perform validation
config.validate({ allowed: "strict" })

// console.log("env", config.get("env"))
// console.log("github build org", config.get("github.buildOrgName"))
// console.log("GG", process.env["GITGUARDIAN_API_KEY"])
// console.log(config.get("gitGuardian"))

module.exports = config
export { config }
