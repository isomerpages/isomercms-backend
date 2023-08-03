#!/bin/bash

# AWS region
AWS_REGION="ap-southeast-1"

# Set AWS region
aws configure set default.region $AWS_REGION

# Get the env type from EB
ENV_TYPE=$(/opt/elasticbeanstalk/bin/get-config environment -k SSM_PREFIX)

# Fetch git username and email from SSM Parameter Store
GIT_USERNAME=$(aws ssm get-parameter --name "${ENV_TYPE}_GIT_USERNAME" --query "Parameter.Value" --output text --region $AWS_REGION)
GIT_EMAIL=$(aws ssm get-parameter --name "${ENV_TYPE}_GIT_EMAIL" --query "Parameter.Value" --output text --region $AWS_REGION)

# Set Git global configuration
git config --global user.name "$GIT_USERNAME"
git config --global user.email "$GIT_EMAIL"