import convict from "convict"

convict.addFormat({
  name: "required-string",
  validate: (val: any) => {
    if (!val) throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "string") throw new Error("value must be a string")
  },
})

convict.addFormat({
  name: "required-positive-number",
  validate: (val: any) => {
    if (val === null || val === undefined || val === "")
      throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "number") throw new Error("value must be a number")
  },
  coerce: (val: string) => {
    const coercedVal = Number(val)
    if (isNaN(coercedVal)) {
      throw new Error(
        "value provided is not a positive number. please provide a valid positive number"
      )
    }
    if (coercedVal <= 0) {
      throw new Error("value must be more than zero")
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
    format: ["dev", "test", "prod", "staging", "vapt"],
    default: "dev",
  },
  port: {
    doc: "The port to bind.",
    env: "PORT",
    format: "required-positive-number",
    default: 8081,
  },
  gitGuardian: {
    doc: "API Key for GitGuardian pre-commit hooks",
    env: "GITGUARDIAN_API_KEY",
    sensitive: true,
    format: String,
    default: "",
  },
  cloudmersiveKey: {
    doc: "API Key for Cloudmersive scanning",
    env: "CLOUDMERSIVE_API_KEY",
    sensitive: true,
    format: "required-string",
    default: "",
  },
  app: {
    frontendUrl: {
      doc: "URL of the frontend application",
      env: "FRONTEND_URL",
      format: "required-string",
      default: "",
    },
  },
  mutexTableName: {
    doc: "Name of the DynamoDB table used for mutexes",
    env: "MUTEX_TABLE_NAME",
    format: "required-string",
    default: "isomer-mutexes",
  },
  auth: {
    cookieDomain: {
      doc: "Domain to set for auth cookie",
      env: "COOKIE_DOMAIN",
      format: ["localhost", "cms.isomer.gov.sg", "isomer.gov.sg"],
      default: "localhost",
    },
    tokenExpiryInMs: {
      doc: "Expiry duration for auth token in milliseconds",
      env: "AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS",
      format: "required-positive-number",
      default: 3600000, // 1 hour
    },
    jwtSecret: {
      doc: "Secret used to sign auth tokens",
      env: "JWT_SECRET",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    encryptionSecret: {
      doc: "Secret used to encrypt access GitHub access token",
      env: "ENCRYPTION_SECRET",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    maxNumOtpAttempts: {
      doc: "Maximum number of OTP attempts allowed",
      env: "MAX_NUM_OTP_ATTEMPTS",
      format: "required-positive-number",
      default: 5,
    },
    otpExpiry: {
      doc: "Expiry duration for OTP in milliseconds",
      env: "OTP_EXPIRY",
      format: "required-positive-number",
      default: 900000,
    },
    sessionSecret: {
      doc: "Secret used for sessions",
      env: "SESSION_SECRET",
      sensitive: true,
      format: "required-string",
      default: "",
    },
  },
  aws: {
    region: {
      doc: "AWS region",
      env: "AWS_REGION",
      format: "required-string",
      default: "ap-southeast-1",
    },
    amplify: {
      accountNumber: {
        doc: "AWS account number (microservices)",
        env: "AWS_ACCOUNT_NUMBER",
        sensitive: true,
        format: String,
        default: "",
      },
      accessKeyId: {
        doc: "AWS access key ID (microservices)",
        env: "AWS_ACCESS_KEY_ID",
        sensitive: true,
        format: String,
        default: "",
      },
      secretAccessKey: {
        doc: "AWS secret access key (microservices)",
        env: "AWS_SECRET_ACCESS_KEY",
        sensitive: true,
        format: String,
        default: "",
      },
      mockAmplifyDomainAssociationCalls: {
        doc: "Mock domain association calls to Amplify",
        env: "MOCK_AMPLIFY_DOMAIN_ASSOCIATION_CALLS",
        format: "required-boolean",
        default: true,
      },
      passwordSecretKey: {
        doc: "Secret key used to encrypt password",
        env: "SITE_PASSWORD_SECRET_KEY",
        format: "required-string",
        default: "",
      },
    },
    dynamodb: {
      siteLaunchTableName: {
        doc: "Name of the DynamoDB table used for site launches",
        env: "SITE_LAUNCH_DYNAMO_DB_TABLE_NAME",
        format: "required-string",
        default: "site-launch",
      },
    },
    efs: {
      volPath: {
        doc: "Path to the EFS volume for storing the Git repositories",
        env: "EFS_VOL_PATH",
        format: "required-string",
        default: "/efs",
      },
    },
    stepFunctions: {
      stepFunctionsArn: {
        doc: "Amazon Resource Name (ARN) of the Step Functions state machine",
        env: "STEP_FUNCTIONS_ARN",
        format: "required-string",
        default: "",
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
      default: "",
    },
    clientSecret: {
      doc: "GitHub OAuth app Client secret",
      env: "CLIENT_SECRET",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    redirectUri: {
      doc: "URL to redirect to after authentication with GitHub",
      env: "REDIRECT_URI",
      format: "required-string",
      default: "",
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
      default: "",
    },
  },
  dataDog: {
    env: {
      doc: "The DataDog environment",
      format: [
        "development",
        "local",
        "staging",
        "vapt",
        "uat",
        "production",
        "prod",
        "stg",
        "dev",
      ],
      env: "DD_ENV",
      default: "local",
    },
    service: {
      doc: "The DataDog service",
      env: "DD_SERVICE",
      format: "required-string",
      default: "",
    },
    tags: {
      doc: "The DataDog tags",
      env: "DD_TAGS",
      format: "required-string",
      default: "",
    },
  },
  formSg: {
    siteCreateFormKey: {
      doc: "FormSG API key for site creation form",
      env: "SITE_CREATE_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    siteLaunchFormKey: {
      doc: "FormSG API key for site launch form",
      env: "SITE_LAUNCH_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    ggsRepairFormKey: {
      doc: "FormSG API key for GGs repair form",
      env: "GGS_REPAIR_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    siteCheckerFormKey: {
      doc: "FormSG API key for site checker form",
      env: "SITE_CHECKER_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    siteAuditLogsFormKey: {
      doc: "FormSG API key for site audit logs form",
      env: "SITE_AUDIT_LOGS_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    notifySiteCollaboratorsFormKey: {
      doc: "FormSG API key for notify site collaborators form",
      env: "NOTIFY_SITE_COLLABORATORS_FORM_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
  },
  postman: {
    apiKey: {
      doc: "Postman API key",
      env: "POSTMAN_API_KEY",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    smsCredName: {
      doc: "Postman SMS credential name",
      env: "POSTMAN_SMS_CRED_NAME",
      format: "required-string",
      default: "",
    },
  },
  cypress: {
    e2eTestRepo: {
      doc: "Name of the e2e test GitHub repository",
      env: "E2E_TEST_REPO",
      format: "required-string",
      default: "e2e-test-repo",
    },
    e2eTestSecret: {
      doc: "Secret for e2e tests",
      env: "E2E_TEST_SECRET",
      sensitive: true,
      format: "required-string",
      default: "",
    },
    e2eTestGithubToken: {
      doc:
        "GitHub access token for e2e tests. Replace with your own token and make sure the github user is in your local database",
      env: "E2E_TEST_GH_TOKEN",
      sensitive: true,
      format: "required-string",
      default: "",
    },
  },
  database: {
    dbUri: {
      doc: "Database URI",
      env: "DB_URI",
      sensitive: true,
      format: "required-string",
      default: "postgres://isomer:password@localhost:54321/isomercms_test",
    },
    dbMinPool: {
      doc: "Minimum number of connections in the pool",
      env: "DB_MIN_POOL",
      format: "required-positive-number",
      default: 1,
    },
    dbMaxPool: {
      doc: "Maximum number of connections in the pool",
      env: "DB_MAX_POOL",
      format: "required-positive-number",
      default: 10,
    },
    dbAcquire: {
      doc:
        "The maximum time, in milliseconds, that pool will try to get connection before throwing error",
      env: "DB_ACQUIRE",
      format: "required-positive-number",
      default: 60000,
    },
    dbTimeout: {
      doc:
        "The maximum time, in milliseconds, before an idle session within an open transaction will be terminated",
      env: "DB_TIMEOUT",
      format: "required-positive-number",
      default: 10000,
    },
    dbEnableLogging: {
      doc: "Enable database logging",
      env: "DB_ENABLE_LOGGING",
      format: "required-boolean",
      default: false,
    },
  },
  netlify: {
    accessToken: {
      doc: "Access token for netlify actions",
      env: "NETLIFY_ACCESS_TOKEN",
      format: "required-string",
      default: "",
    },
  },
  sgid: {
    clientId: {
      doc: "sgID client ID provided during client registration",
      env: "SGID_CLIENT_ID",
      format: String,
      default: "mock-client-id",
    },
    clientSecret: {
      doc: "sgID client secret provided during client registration",
      env: "SGID_CLIENT_SECRET",
      format: String,
      default: "mock-client-secret",
    },
    privateKey: {
      doc: "sgID client private key provided during client registration",
      env: "SGID_PRIVATE_KEY",
      format: String,
      default: "mock-private-key",
    },
    redirectUri: {
      doc: "URL to redirect to after authentication with sgID",
      env: "SGID_REDIRECT_URI",
      format: String,
      default: "mock-redirect-uri",
    },
  },
  growthbook: {
    clientKey: {
      doc: "GrowthBook SDK client key",
      env: "GROWTHBOOK_CLIENT_KEY",
      format: "required-string",
      default: "",
    },
  },
  featureFlags: {
    ggsTrackedSites: {
      doc: "Comma-separated list of tracked sites for GitHub API hits",
      env: "GGS_EXPERIMENTAL_TRACKING_SITES",
      format: String,
      default: "",
    },
  },
  uptimeRobot: {
    apiKey: {
      doc: "Uptime Robot API key",
      env: "UPTIME_ROBOT_API_KEY",
      format: String,
      default: "",
    },
  },
})

// Perform validation
config.validate({ allowed: "strict" })

export default config
export { config }
