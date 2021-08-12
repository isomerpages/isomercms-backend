require("dotenv").config()
const convict = require("convict")

const { NODE_ENV } = process.env
const isLocalDev = NODE_ENV === "LOCAL_DEV"

convict.addFormat({
  name: "required-string",
  validate: (val) => {
    if (!val) throw new Error("value cannot be empty, null or undefined")
    if (typeof val !== "string") throw new Error("value must be a string")
  },
})
convict.addFormat({
  name: "required-remote-string",
  validate: (val) => {
    // Only validate if not running locally
    if (!isLocalDev && (!val || typeof val !== "string"))
      throw new Error("value cannot be empty, null or undefined")
  },
})

const config = convict({
  app: {
    isProduction: {
      doc: "Whether the current environment is a production environment",
      format: Boolean,
      default: NODE_ENV !== "LOCAL_DEV" && NODE_ENV !== "DEV",
    },
    frontendUrl: {
      doc: "URL of frontend used for redrection",
      env: "FRONTEND_URL",
      format: "required-string",
      default: null,
    },
    navFilePath: {
      doc: "File path of navigation config",
      format: String,
      default: "navigation.yml",
    },
    footerFilePath: {
      doc: "File path of footer file",
      format: String,
      default: "footer.yml",
    },
    homepageIndexFilePath: {
      doc: "File path of homepage index file",
      format: String,
      default: "index.md",
    },
    templateDirs: {
      doc: "List of template directories",
      format: Array,
      default: ["_data", "_includes", "_site", "_layouts"],
    },
    protectedDirs: {
      doc: "List of protected directories",
      format: Array,
      default: [
        "data",
        "includes",
        "site",
        "layouts",
        "files",
        "images",
        "misc",
        "pages",
      ],
    },
    allowedFileExtensions: {
      doc: "Allowed file extensions for uploads",
      format: Array,
      default: ["pdf", "png", "jpg", "gif", "tif", "bmp", "ico"],
    },
    sites: {
      pageSize: {
        doc: "Number of repos to retrieve from GitHub API for each request",
        env: "ISOMERPAGES_REPO_PAGE_SIZE",
        format: "nat",
        default: 100,
      },
      pageCount: {
        doc: "Number of pages of repos to retrieve from GitHub API",
        env: "ISOMERPAGES_REPO_PAGE_COUNT",
        format: "nat",
        default: 3,
      },
      adminRepos: {
        doc: "Admin repositories to be excluded from sites",
        format: Array,
        default: [
          "isomercms-backend",
          "isomercms-frontend",
          "isomer-redirection",
          "isomerpages-template",
          "isomer-conversion-scripts",
          "isomer-wysiwyg",
          "isomer-slackbot",
          "isomer-tooling",
          "generate-site",
          "travisci-scripts",
          "recommender-train",
          "editor",
          "ci-test",
          "infra",
          "markdown-helper",
        ],
      },
    },
    resource: {
      indexFilePath: {
        doc: "Path to index file",
        format: String,
        default: "index.html",
      },
    },
    resourceRoom: {
      indexFilePath: {
        doc: "Path to index file",
        format: String,
        default: "index.html",
      },
    },
  },
  aws: {
    region: {
      doc: "AWS region",
      env: "AWS_REGION",
      format: String,
      default: "ap-southeast-1",
    },
    beanstalkEnvName: {
      doc: "Backend Elastic beanstalk environment name",
      env: "AWS_BACKEND_EB_ENV_NAME",
      format: "required-remote-string",
      default: null,
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
    redirectUrl: {
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
  },
  auth: {
    cookieName: {
      doc: "Name of session cookie",
      env: "COOKIE_NAME",
      format: "required-string",
      default: "isomercms",
    },
    csrfCookieName: {
      doc: "Name of CSRF cookie",
      env: "CSRF_COOKIE_NAME",
      format: "required-string",
      default: "isomer-csrf",
    },
    csrfTokenExpiry: {
      doc: "Expiry duration for CSRF token in milliseconds",
      env: "CSRF_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS",
      format: "nat", // Positive integer
      default: 600000,
    },
    tokenExpiry: {
      doc: "Expiry duration for auth token in milliseconds",
      env: "AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS",
      format: "nat", // Positive integer
      default: 3600000,
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
  },
  mutex: {
    enabled: {
      doc: "Whether mutex should be used in the current environment",
      format: Boolean,
      default: NODE_ENV !== "LOCAL_DEV",
    },
    tableName: {
      doc: "DynamoDB table name used for handling site modification mutexes",
      env: "MUTEX_TABLE_NAME",
      format: "required-remote-string",
      default: null,
    },
  },
})

// Validate configuration
config.validate()

module.exports = config
