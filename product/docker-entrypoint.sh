#!/bin/sh
set -e

cd /usr/src/product

# Function to clean and reinstall dependencies
clean_and_install() {
  echo "🔄 Cleaning cache and reinstalling dependencies..."
  # Remove node_modules and yarn.lock to force fresh install
  # Handle "Resource busy" error by ignoring it (container might be using files)
  rm -rf node_modules yarn.lock 2>/dev/null || true
  # yarn cache clean (without package name), cause yarn caches packages by name (@ecom-rmk/libs), not by version or file path. When using file: protocol.tgz
  yarn cache clean
  echo "📦 Installing product service dependencies..."
  yarn install --force
}

# Check if package.json or yarn.lock changed compared to previous install
if [ -d "node_modules" ] && [ -f "node_modules/.yarn-integrity" ]; then
  # Check if package.json or yarn.lock is newer than yarn-integrity
  if [ "package.json" -nt "node_modules/.yarn-integrity" ] || \
     [ "yarn.lock" -nt "node_modules/.yarn-integrity" ] || \
     [ ! -f "yarn.lock" ]; then
    clean_and_install
  else
    echo "✅ package.json and yarn.lock unchanged, skipping yarn install"
    # Try to verify integrity, if fails, force reinstall
    if ! yarn check --integrity 2>/dev/null; then
      echo "⚠️ Integrity check failed, forcing reinstall..."
      clean_and_install
    fi
  fi
else
  clean_and_install
fi

# Check if Prisma client is generated
if [ ! -d "generated/prisma" ] || [ "prisma/schema.prisma" -nt "generated/prisma/client.js" ]; then
  echo "🔄 Generating Prisma client..."
  yarn prisma generate
else
  echo "✅ Prisma client is up to date"
fi

echo "✅ product service dependencies ready"

# Execute the command passed to the container
exec "$@"

