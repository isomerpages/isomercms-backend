#!/bin/bash

echo "Set AWS region"
sudo aws configure set default.region ap-southeast-1

echo "Fetching CLIENT_ID from SSM"
CLIENT_ID=$(sudo aws ssm get-parameter --name STAGING_CLIENT_ID --with-decryption --query "Parameter.Value" --output text)
echo "export CLIENT_ID=$CLIENT_ID" | sudo tee -a /opt/elasticbeanstalk/deployment/env
echo "Exported CLIENT_ID"