#!/bin/bash

echo "Set AWS region"
sudo aws configure set default.region ap-southeast-1

echo "Fetching CLIENT_ID from SSM"
CLIENT_ID=$(sudo aws ssm get-parameter --name STAGING_CLIENT_ID --with-decryption --query "Parameter.Value" --output text)
echo "CLIENT_ID=$CLIENT_ID" | sudo tee -a /opt/elasticbeanstalk/deployment/env
echo "Saved CLIENT_ID"

echo "Fetching AWS_REGION from SSM"
AWS_REGION=$(sudo aws ssm get-parameter --name STAGING_AWS_REGION --with-decryption --query "Parameter.Value" --output text)
echo "AWS_REGION=$AWS_REGION" | sudo tee -a /opt/elasticbeanstalk/deployment/env
echo "Saved AWS_REGION"