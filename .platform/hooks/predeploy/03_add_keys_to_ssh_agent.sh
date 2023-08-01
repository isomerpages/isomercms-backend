#!/bin/bash

SSH_PRIVATE_KEY_PATH=/home/ec2-user/.ssh/github

eval "(ssh-agent -s)
ssh-add $SSH_PRIVATE_KEY_PATH
echo "SSH Key added to ssh-agent"

# for troubleshooting if required
ssh-add -l > /tmp/ssh-agent-identities.txt 