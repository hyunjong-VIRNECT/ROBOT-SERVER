# Build Stage
FROM node:12-alpine AS builder

COPY . .

ARG NODE_ENV=production

RUN npm install express
RUN npm install socket.io@2.3.0
RUN npm install eureka-js-client

# Runtime Stage
FROM node:12-alpine

ENV APP_HOME=/usr/app
WORKDIR $APP_HOME

COPY --from=builder . .

EXPOSE 3458
CMD ["node", "release_socket_server.js"]
