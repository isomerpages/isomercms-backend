#!/bin/bash

# Exit on first error
set -e

# Make sure the local directory exists
mkdir -p /tmp/isomer

# If the temp .isomer.env file exists, remove it
if [ -f "/tmp/isomer/.isomer.env" ]; then
    rm /tmp/isomer/.isomer.env
fi

# Create EFS directory if it does not exist
if [ ! -d "/efs/isomer" ]; then
    mkdir -p /efs/isomer
    chown webapp:webapp /efs/isomer
fi

ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "Timestamp: $TIMESTAMP - ENV TYPE: $ENV_TYPE" > /tmp/ssm-type.txt

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
)

echo "Set AWS region"
aws configure set default.region ap-southeast-1

set +e  # Do not exit if a command fails

for ENV_VAR in "${ENV_VARS[@]}"; do
    echo "Fetching ${ENV_VAR} from SSM"
    
    VALUE=$(aws ssm get-parameter --name "${ENV_TYPE}_${ENV_VAR}" --with-decryption --query "Parameter.Value" --output text 2>/dev/null)
    STATUS=$?  # Capture exit status of the aws ssm command
    
    if [ $STATUS -ne 0 ]; then
        echo "Failed to fetch ${ENV_VAR}. Skipping."
        continue
    fi
    
    echo "${ENV_VAR}=${VALUE}" >> /tmp/isomer/.isomer.env
    echo "Saved ${ENV_VAR}"
done

set -e  # Exit on command failure from this point onwards

# Use flock to ensure that the EFS file is locked during the copy operation
(
  flock -n 200 || exit 1

  # Copy the local file to EFS
  echo "Copying local env file to EFS"
  cp /tmp/isomer/.isomer.env /efs/isomer/.isomer.env

  # Ensure the file on EFS is owned by webapp so it has access
  chown webapp:webapp /efs/isomer/.isomer.env

) 200>/efs/isomer/.isomer.lock

# Check the exit code of the last command (flock in this case)
if [ $? != 1 ]; then
    echo "Lock acquired and data copied successfully."
    # Remove the temp file
    rm /tmp/isomer/.isomer.env
else
    echo "Couldn't acquire the lock. Another instance might be writing to the file."
fi

echo "Operation completed."