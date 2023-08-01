#!/bin/bash

# Get the env type from EB
ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)

SSH_PUBLIC_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PUBLIC_KEY"
SSH_PRIVATE_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PRIVATE_KEY"

AWS_REGION="ap-southeast-1"
SSH_PUBLIC_KEY=$(aws ssm get-parameter --name $SSH_PUBLIC_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text)
SSH_PRIVATE_KEY=$(aws ssm get-parameter --name $SSH_PRIVATE_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text)

# Write the key to the authorized_keys file
echo "$SSH_PUBLIC_KEY" > .ssh/github.pub
echo "$SSH_PRIVATE_KEY" > .ssh/github

# Set the permissions for the keys
chmod 600 .ssh/github.pub
chmod 600 .ssh/github