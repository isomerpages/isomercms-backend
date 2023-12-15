FROM node:18-alpine AS base
WORKDIR /opt/isomercms-backend
COPY . .
RUN npm ci
EXPOSE "8081"
CMD ["npm", "run", "dev:server"]
