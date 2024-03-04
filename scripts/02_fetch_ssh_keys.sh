#!/bin/bash
ENV_TYPE=$ENV_TYPE

SSH_PUBLIC_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PUBLIC_KEY"
SSH_PRIVATE_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PRIVATE_KEY"

# create .ssh folder if it does not exist
mkdir -p /home/webapp/.ssh

SSH_PUBLIC_KEY_VALUE="${!SSH_PUBLIC_KEY_PARAM_NAME}"
SSH_PRIVATE_KEY_VALUE="${!SSH_PRIVATE_KEY_PARAM_NAME}"

echo "Fetching keys"
echo "$SSH_PUBLIC_KEY_VALUE" >/home/webapp/.ssh/github.pub || {
    echo "Failed to fetch SSH public key"
    exit 1
}
echo "$SSH_PRIVATE_KEY_VALUE" >/home/webapp/.ssh/github || {
    echo "Failed to fetch SSH private key"
    exit 1
}

# Set the permissions for the keys
echo "Setting permissions"
chmod 600 /home/webapp/.ssh/github.pub
chmod 600 /home/webapp/.ssh/github

echo "Fetching keys complete"
