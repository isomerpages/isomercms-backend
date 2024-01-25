#!/bin/bash

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
