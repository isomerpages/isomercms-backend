FROM node:18-alpine AS base
WORKDIR /opt/isomercms-backend

RUN apk update && \
  apk add --no-cache bash && \
  apk add git && \
  apk add openssh-client

RUN adduser -u 900 webapp -D -h /home/webapp -s /bin/sh
USER webapp
COPY . .

# NOTE: We need to set up as root again because we need to perform chmod
# We will fix all the permissions issue with a final chown to webapp
USER root

RUN mkdir /home/webapp/.ssh

RUN chmod +x ./scripts/03_add_keys_to_ssh_config.sh
RUN sh ./scripts/03_add_keys_to_ssh_config.sh

RUN chmod +x ./scripts/04_add_github_to_known_hosts.sh
RUN sh ./scripts/04_add_github_to_known_hosts.sh

RUN npm ci
# NOTE: Removing the cache here to keep the image small
RUN rm -rf /var/cache/apk/*

RUN git config --system --add safe.directory '*'
RUN echo "[user]" > /root/.gitconfig
RUN echo "  name = Isomer Admin" >> /root/.gitconfig
RUN echo "  email = admin@isomer.gov.sg" >> /root/.gitconfig

RUN chmod +x ./scripts/02_fetch_ssh_keys.sh

RUN chown -R webapp:webapp /home/webapp/.ssh

# NOTE: We need to run the app as webapp, otherwise we will encounter
# permissions issues on EFS, and all files will be erroneously owned by root.
USER webapp
EXPOSE "8081"
CMD ["bash", "-c", "bash ./scripts/02_fetch_ssh_keys.sh & npm run start:ecs:$NODE_ENV"]
