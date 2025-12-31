# Dockerfile for building and packing libs
FROM node:24-alpine

WORKDIR /usr/src/libs

# Install dependencies
RUN apk add --no-cache git

# Copy package files
COPY package.json ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code (needed for yarn build in pack:dry)
COPY . .

# Build and run pack:dry to verify the package
RUN yarn pack:dry

# The container will exit after pack:dry completes
# This is useful for CI/CD to verify the package can be built correctly

