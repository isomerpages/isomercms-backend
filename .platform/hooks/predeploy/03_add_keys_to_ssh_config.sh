#!/bin/bash

# add github as host and ssh key to ssh config
cat << EOF > /home/webapp/.ssh/config
Host github.com
  IdentityFile /home/webapp/.ssh/github
  User git
EOF