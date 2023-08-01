#!/bin/bash

# Get the env type from EB
ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)

SSH_PUBLIC_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PUBLIC_KEY"
SSH_PRIVATE_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PRIVATE_KEY"

echo "Set AWS region"
aws configure set default.region ap-southeast-1

echo "Fetching keys"
aws ssm get-parameter --name $SSH_PUBLIC_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text > /home/ec2-user/.ssh/github.pub
aws ssm get-parameter --name $SSH_PRIVATE_KEY_PARAM_NAME --with-decryption --query "Parameter.Value" --output text > /home/ec2-user/.ssh/github

# Set the permissions for the keys
echo "Setting permissions"
chmod 600 /home/ec2-user/.ssh/github.pub
chmod 600 /home/ec2-user/.ssh/github

echo "Fetching keys complete"