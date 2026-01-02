# Dockerfile for building and packing libs
# Use official Bun image (see all versions at https://hub.docker.com/r/oven/bun/tags)
FROM oven/bun:1

WORKDIR /usr/src/libs

# Install dependencies for git (if needed)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code (needed for bun build in pack:publish)
COPY . .

# Build and run pack:publish to verify the package
RUN bun run pack:publish

# The container will exit after pack:publish completes
# This is useful for CI/CD to verify the package can be built correctly

