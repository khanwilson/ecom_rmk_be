#!/bin/sh
set -e

cd /usr/src/product

# Function to clean and reinstall dependencies
clean_and_install() {
  echo "🔄 Cleaning cache and reinstalling dependencies..."
  # Remove node_modules and bun.lock to force fresh install
  # Handle "Resource busy" error by ignoring it (container might be using files)
  rm -rf node_modules bun.lock 2>/dev/null || true
  # bun install --force: force reinstall all packages, similar to yarn install --force
  echo "📦 Installing product service dependencies..."
  bun install --force
}

# Check if package.json or bun.lock changed compared to previous install
if [ -d "node_modules" ] && [ -f "bun.lock" ]; then
  # Check if package.json or bun.lock is newer than node_modules
  if [ "package.json" -nt "node_modules" ] || \
     [ "bun.lock" -nt "node_modules" ] || \
     [ ! -f "bun.lock" ]; then
    clean_and_install
  else
    echo "✅ package.json and bun.lock unchanged, skipping bun install"
    # Verify by checking if node_modules exists and has packages
    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
      echo "⚠️ node_modules invalid or empty, forcing reinstall..."
      clean_and_install
    fi
  fi
else
  clean_and_install
fi

# Check if Prisma client is generated
if [ ! -d "generated/prisma" ] || [ "prisma/schema.prisma" -nt "generated/prisma/client.js" ]; then
  echo "🔄 Generating Prisma client..."
  bunx prisma generate
else
  echo "✅ Prisma client is up to date"
fi

echo "✅ product service dependencies ready"

# Execute the command passed to the container
exec "$@"

