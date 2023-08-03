#!/bin/bash

# Get the server's public key
ssh-keyscan -t rsa github.com > github_rsa.pub

# Generate the key's fingerprint
SERVER_FINGERPRINT=$(ssh-keygen -lf github_rsa.pub | awk '{print $2}')
echo "SERVER_FINGERPRINT: $SERVER_FINGERPRINT" > /tmp/setup-github-known-hosts.txt

# The official GitHub RSA fingerprint
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
OFFICIAL_FINGERPRINT="SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s"

# Check if the server's fingerprint matches the official fingerprint
# Note: This check is important to prevent any MITM attacks
if [ "$SERVER_FINGERPRINT" = "$OFFICIAL_FINGERPRINT" ]; then
    # If the fingerprints match, add the public key to the known_hosts file
    cat github_rsa.pub > /home/webapp/.ssh/known_hosts
    echo "GitHub's public key added to known_hosts." >> /tmp/setup-github-known-hosts.txt
else
    # If the fingerprints don't match, output a warning and exit with an error
    echo "WARNING: The server's SSH key fingerprint doesn't match the official GitHub fingerprint." >> /tmp/setup-github-known-hosts.txt
    exit 1
fi

# Remove the temporary public key file
rm github_rsa.pub

# all the above would have been performed as root
# so we need to allow webapp user to access so that it can add to the known_hosts etc.
chown -R webapp:webapp /home/webapp/.ssh