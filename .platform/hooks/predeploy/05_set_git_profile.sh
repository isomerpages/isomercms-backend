#!/bin/bash

# Get the env type from EB
ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)

GIT_USER_NAME_PARAM_NAME="${ENV_TYPE}_GIT_USER_NAME"
GIT_USER_EMAIL_PARAM_NAME="${ENV_TYPE}_GIT_USER_EMAIL"

# Set AWS region
aws configure set default.region ap-southeast-1

# Fetch git user's name and email from SSM
GIT_USER_NAME=$(aws ssm get-parameter --name $GIT_USER_NAME_PARAM_NAME --with-decryption --query "Parameter.Value" --output text)
GIT_USER_EMAIL=$(aws ssm get-parameter --name $GIT_USER_EMAIL_PARAM_NAME --with-decryption --query "Parameter.Value" --output text)

# Check if required variables are not empty
if [[ -z $GIT_USER_NAME || -z $GIT_USER_EMAIL ]]; then
    echo "Error: Failed to fetch Git user information from AWS SSM." > /tmp/setup-git-profile.txt
    exit 1
fi

# Write the configuration to .gitconfig
echo "[user]" >> /home/webapp/.gitconfig
echo "  name = $GIT_USER_NAME" >> /home/webapp/.gitconfig
echo "  email = $GIT_USER_EMAIL" >> /home/webapp/.gitconfig

echo "Git global config has been set with the following values:"
echo "User name: $GIT_USER_NAME" > /tmp/setup-git-profile.txt
echo "User email: $GIT_USER_EMAIL" >> /tmp/setup-git-profile.txt
