#!/bin/bash

echo "Fetching keys"
cat ./.ssh/github.pub >/root/.ssh/github.pub || {
    echo "Failed to fetch SSH public key"
    exit 1
}
cat ./.ssh/github >/root/.ssh/github || {
    echo "Failed to fetch SSH private key"
    exit 1
}

# Set the permissions for the keys
echo "Setting permissions"
chmod 600 /root/.ssh/github.pub
chmod 600 /root/.ssh/github

echo "Fetching keys complete"
