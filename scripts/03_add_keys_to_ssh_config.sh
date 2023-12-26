#!/bin/bash

# add github as host and ssh key to ssh config
cat << EOF > /root/.ssh/config
Host github.com
  IdentityFile /root/.ssh/github
  User git
EOF