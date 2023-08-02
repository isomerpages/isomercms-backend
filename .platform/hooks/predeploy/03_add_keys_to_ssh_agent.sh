#!/bin/bash

SSH_PRIVATE_KEY_PATH=/home/ec2-user/.ssh/github

eval "$(ssh-agent -s)"
ssh-add $SSH_PRIVATE_KEY_PATH
echo "SSH Key added to ssh-agent"

# for troubleshooting if required
ssh-add -l > /tmp/ssh-agent-identities.txt

# Add the commands to the end of .bashrc
echo "" >> /home/ec2-user/.bashrc
echo "# SSH agent settings" >> /home/ec2-user/.bashrc
echo "if [ -z \"\$SSH_AUTH_SOCK\" ] ; then" >> /home/ec2-user/.bashrc
echo "  eval \`ssh-agent -s\`" >> /home/ec2-user/.bashrc
echo "  ssh-add $SSH_PRIVATE_KEY_PATH" >> /home/ec2-user/.bashrc
echo "fi" >> /home/ec2-user/.bashrc