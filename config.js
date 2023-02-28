const convict = require("convict")

const { NODE_ENV } = process.env
const isLocalDev = NODE_ENV === "LOCAL_DEV"

// validate in all environments
convict.addFormat({
  name: "required-string",
  validate: (val) => {
    if (!val) throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "string") throw new Error("value must be a string")
  },
})

// validate only if not running locally
convict.addFormat({
  name: "required-remote-string",
  validate: (val) => {
    if (!isLocalDev && (!val || typeof val !== "string"))
      throw new Error("value cannot be empty, null or undefined")
  },
})

// Define a schema
const config = convict({
  env: {
    doc: "The application environment.",
    format: ["production", "development", "test"],
    default: "LOCAL_DEV",
    env: "NODE_ENV",
  },
  auth: {
    cookieDomain: {
      doc: "Domain to set for auth cookie",
      env: "AUTH_COOKIE_DOMAIN",
      format: "required-string",
      default: "localhost",
    },
    tokenExpiry: {
      doc: "Expiry duration for auth token in milliseconds",
      env: "AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS",
      format: "nat", // Positive integer (natural number)
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
      format: "nat", // Positive integer (natural number)
    },
    otpExpiry: {
      doc: "Expiry duration for OTP in milliseconds",
      env: "OTP_EXPIRY",
      format: "nat", // Positive integer (natural number)
    },
  },
  aws: {
    amplify: {
      region: {
        doc: "AWS region",
        env: "AWS_REGION",
        format: "required-string",
      },
      accountNumber: {
        doc: "AWS account number",
        env: "AWS_ACCOUNT_NUMBER",
        sensitive: true,
        format: "required-string",
      },
      accessKeyId: {
        doc: "AWS access key ID",
        env: "AWS_ACCESS_KEY_ID",
        sensitive: true,
        format: "required-string",
      },
      secretAccessKey: {
        doc: "AWS secret access key",
        env: "AWS_SECRET_ACCESS_KEY",
        sensitive: true,
        format: "required-string",
      },
    },
    sqs: {
      incomingQueueUrl: {
        doc: "URL of the incoming SQS queue",
        env: "INCOMING_QUEUE_URL",
        format: "required-string",
      },
      outgoingQueueUrl: {
        doc: "URL of the outgoing SQS queue",
        env: "OUTGOING_QUEUE_URL",
        format: "required-string",
      },
      siteLaunchQueueUrl: {
        doc: "URL of the site launch SQS queue",
        env: "SITE_LAUNCH_QUEUE_URL",
        format: "required-string",
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
    },
  },
  dataDog: {
    env: {
      doc: "The DataDog environment",
      format: ["production", "development", "local"],
      default: "local",
      env: "DD_ENV",
    },
    service: {
      doc: "The DataDog service",
      env: "DD_SERVICE",
      format: "required-string",
    },
    tags: {
      doc: "The DataDog tags",
      env: "DD_TAGS",
      format: "required-string",
    },
  },
  formSg: {
    siteCreateFormKey: {
      doc: "FormSG API key for site creation form",
      env: "SITE_CREATE_FORM_KEY",
      sensitive: true,
      format: "required-string",
    },
  },
  postman: {
    apiKey: {
      doc: "Postman API key",
      env: "POSTMAN_API_KEY",
      sensitive: true,
      format: "required-string",
    },
    smsCredName: {
      doc: "Postman SMS credential name",
      env: "POSTMAN_SMS_CRED_NAME",
      format: "required-string",
    },
  },
})

// Perform validation
config.validate({ allowed: "strict" })

module.exports = config
