#!/bin/bash

# Get the env type from EB
ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)

SSH_PUBLIC_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PUBLIC_KEY"
SSH_PRIVATE_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PRIVATE_KEY"

echo "Set AWS region"
aws configure set default.region ap-southeast-1

# create .ssh folder if it does not exist
mkdir -p /home/webapp/.ssh

echo "Fetching keys"
# Note we write to webapp user directory which runs our app
aws ssm get-parameter --name $SSH_PUBLIC_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text > /home/webapp/.ssh/github.pub || { echo "Failed to fetch SSH public key"; exit 1; }
aws ssm get-parameter --name $SSH_PRIVATE_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text > /home/webapp/.ssh/github || { echo "Failed to fetch SSH private key"; exit 1; }

# Set the permissions for the keys
echo "Setting permissions"
chmod 600 /home/webapp/.ssh/github.pub
chmod 600 /home/webapp/.ssh/github

echo "Fetching keys complete"
