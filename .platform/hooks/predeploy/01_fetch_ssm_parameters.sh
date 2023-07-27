#!/bin/bash

echo "Set AWS region"
aws configure set default.region ap-southeast-1

echo "Fetching CLIENT_ID from SSM"
CLIENT_ID=$(aws ssm get-parameter --name STAGING_CLIENT_ID --with-decryption --query "Parameter.Value" --output text)
echo "export CLIENT_ID=$CLIENT_ID" >> /opt/elasticbeanstalk/deployment/env
echo "Exported CLIENT_ID"