#!/bin/bash

SSH_PRIVATE_KEY_PATH=/home/webapp/.ssh/github

eval "$(ssh-agent -s)"
ssh-add $SSH_PRIVATE_KEY_PATH
echo "SSH Key added to ssh-agent"

# for troubleshooting if required
ssh-add -l > /tmp/ssh-agent-identities.txt

# add to ssh config
# Write the configuration to the .ssh/config file
cat << EOF > /home/webapp/.ssh/config
Host github.com
  IdentityFile /home/webapp/.ssh/github
  User git
EOF