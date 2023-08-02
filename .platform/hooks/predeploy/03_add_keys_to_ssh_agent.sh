#!/bin/bash

SSH_PRIVATE_KEY_PATH=/home/ec2-user/.ssh/github

eval "$(ssh-agent -s)"
ssh-add $SSH_PRIVATE_KEY_PATH
echo "SSH Key added to ssh-agent"

# for troubleshooting if required
ssh-add -l > /tmp/ssh-agent-identities.txt

# Add the commands to the end of ec2-user .bashrc
echo "" >> /home/ec2-user/.bashrc
echo "# SSH agent settings" >> /home/ec2-user/.bashrc
echo "if [ -z \"\$SSH_AUTH_SOCK\" ] ; then" >> /home/ec2-user/.bashrc
echo "  eval \`ssh-agent -s\`" >> /home/ec2-user/.bashrc
echo "  ssh-add $SSH_PRIVATE_KEY_PATH" >> /home/ec2-user/.bashrc
echo "fi" >> /home/ec2-user/.bashrc

# Add the commands to the end of root .bashrc
echo "" >> /root/.bashrc
echo "# SSH agent settings" >> /root/.bashrc
echo "if [ -z \"\$SSH_AUTH_SOCK\" ] ; then" >> /root/.bashrc
echo "  eval \`ssh-agent -s\`" >> /root/.bashrc
echo "  ssh-add $SSH_PRIVATE_KEY_PATH" >> /root/.bashrc
echo "fi" >> /root/.bashrc

# Add the commands to the end of webapp .bashrc
echo "" >> /home/webapp/.bashrc
echo "# SSH agent settings" >> /home/webapp/.bashrc
echo "if [ -z \"\$SSH_AUTH_SOCK\" ] ; then" >> /home/webapp/.bashrc
echo "  eval \`ssh-agent -s\`" >> /home/webapp/.bashrc
echo "  ssh-add /home/webapp/.ssh/github" >> /home/webapp/.bashrc
echo "fi" >> /home/webapp/.bashrc