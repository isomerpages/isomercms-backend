#!/bin/bash

ENV_TYPE="DEV"

SSH_PUBLIC_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PUBLIC_KEY"
SSH_PRIVATE_KEY_PARAM_NAME="${ENV_TYPE}_SSH_PRIVATE_KEY"

# create .ssh folder if it does not exist
mkdir -p /root/.ssh

SSH_PUBLIC_KEY_VALUE="${!SSH_PUBLIC_KEY_PARAM_NAME}"
SSH_PRIVATE_KEY_VALUE="${!SSH_PRIVATE_KEY_PARAM_NAME}"

echo "Fetching keys"
echo "$SSH_PUBLIC_KEY_VALUE" >/root/.ssh/github.pub || {
    echo "Failed to fetch SSH public key"
    exit 1
}
echo "$SSH_PRIVATE_KEY_VALUE" >/root/.ssh/github || {
    echo "Failed to fetch SSH private key"
    exit 1
}

# Set the permissions for the keys
echo "Setting permissions"
chmod 600 /root/.ssh/github.pub
chmod 600 /root/.ssh/github

echo "Fetching keys complete"
