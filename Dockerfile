# Development Dockerfile for Root (Shared Libs)
FROM node:24-alpine
WORKDIR /usr/src

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Note: package.json will be mounted from host via volume
# Dependencies will be installed into root_node_modules volume at runtime

# Run entrypoint script (checks and installs dependencies if needed, then exits)
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]