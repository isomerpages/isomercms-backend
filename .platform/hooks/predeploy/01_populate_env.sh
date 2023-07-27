#!/bin/bash

exec >> /var/log/eb-engine.log 2>&1

echo "Configuring AWS region"
aws configure set default.region ap-southeast-1

echo "Fetching CLIENT_ID from SSM"
CLIENT_ID=$(aws ssm get-parameter --name STAGING_CLIENT_ID --with-decryption --query "Parameter.Value" --output text)
sudo tee -a /opt/elasticbeanstalk/deployment/env
echo "Exported CLIENT_ID"

echo "Fetching CLIENT_SECRET from SSM"
CLIENT_SECRET=$(aws ssm get-parameter --name STAGING_CLIENT_SECRET --with-decryption --query "Parameter.Value" --output text)
sudo tee -a /opt/elasticbeanstalk/deployment/env
echo "Exported CLIENT_ID"