#!/bin/bash

# Exit on first error
set -e

# Create directory if it does not exist
if [ ! -d "/etc/isomer" ]; then
    mkdir -p /etc/isomer
    chown webapp:webapp /etc/isomer
fi

# If the .isomer.env file exists, remove it
if [ -f "/etc/isomer/.isomer.env" ]; then
    rm /etc/isomer/.isomer.env
fi

ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)
echo "ENV TYPE: $ENV_TYPE" >> /tmp/ssm-type.txt

# List of all env vars to fetch
ENV_VARS=(
  "AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS"
  "AWS_BACKEND_EB_ENV_NAME"
  "AWS_REGION"
  "CLIENT_ID"
  "CLIENT_SECRET"
  "CLOUDMERSIVE_API_KEY"
  "COOKIE_DOMAIN"
  "DB_ACQUIRE"
  "DB_MAX_POOL"
  "DB_MIN_POOL"
  "DB_TIMEOUT"
  "DB_URI"
  "DD_AGENT_MAJOR_VERSION"
  "DD_ENV"
  "DD_LOGS_INJECTION"
  "DD_SERVICE"
  "DD_TAGS"
  "DD_TRACE_STARTUP_LOGS"
  "E2E_TEST_GH_TOKEN"
  "E2E_TEST_REPO"
  "E2E_TEST_SECRET"
  "EFS_VOL_PATH"
  "ENCRYPTION_SECRET"
  "FF_DEPRECATE_SITE_QUEUES"
  "FRONTEND_URL"
  "GGS_EXPERIMENTAL_TRACKING_SITES"
  "GITHUB_BUILD_ORG_NAME"
  "GITHUB_BUILD_REPO_NAME"
  "GITHUB_ORG_NAME"
  "GROWTHBOOK_CLIENT_KEY"
  "INCOMING_QUEUE_URL"
  "ISOMERPAGES_REPO_PAGE_COUNT"
  "JWT_SECRET"
  "MAX_NUM_OTP_ATTEMPTS"
  "MOCK_AMPLIFY_DOMAIN_ASSOCIATION_CALLS"
  "MUTEX_TABLE_NAME"
  "NETLIFY_ACCESS_TOKEN"
  "NODE_ENV"
  "OTP_EXPIRY"
  "OTP_SECRET"
  "OUTGOING_QUEUE_URL"
  "POSTMAN_API_KEY"
  "POSTMAN_SMS_CRED_NAME"
  "REDIRECT_URI"
  "SESSION_SECRET"
  "SGID_CLIENT_ID" 
  "SGID_CLIENT_SECRET" 
  "SGID_PRIVATE_KEY" 
  "SGID_REDIRECT_URI"
  "SITE_CREATE_FORM_KEY"
  "SITE_LAUNCH_DYNAMO_DB_TABLE_NAME"
  "SITE_LAUNCH_FORM_KEY"
  "SITE_PASSWORD_SECRET_KEY"
  "SSM_PREFIX"
  "STEP_FUNCTIONS_ARN"
  "SYSTEM_GITHUB_TOKEN"
  "TEST_VAR"
)

echo "Set AWS region"
aws configure set default.region ap-southeast-1

for ENV_VAR in "${ENV_VARS[@]}"; do
  echo "Fetching ${ENV_VAR} from SSM"
  VALUE=$(aws ssm get-parameter --name "${ENV_TYPE}_${ENV_VAR}" --with-decryption --query "Parameter.Value" --output text)
  echo "${ENV_VAR}=${VALUE}" >> /etc/isomer/.isomer.env
  echo "Saved ${ENV_VAR}"
done

# Ensure the file is owned by webapp so it has access
chown webapp:webapp /etc/isomer/.isomer.env