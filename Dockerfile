FROM node:18-alpine AS base
WORKDIR /opt/isomercms-backend
COPY . .

RUN apk update && \ 
  apk add --no-cache bash && \
  apk add git && \
  apk add openssh-client

RUN mkdir /root/.ssh

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

EXPOSE "8081"
CMD ["bash", "-c", "bash ./scripts/02_fetch_ssh_keys.sh & npm run start:ecs:$NODE_ENV"] 
