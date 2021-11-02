# Build Stage
FROM node:12-alpine AS builder

COPY . .

ARG NODE_ENV=production

RUN npm install
RUN npm start

# Runtime Stage
FROM node:12-alpine

ENV APP_HOME=/usr/app
WORKDIR $APP_HOME

COPY --from=builder . .

EXPOSE 3458
