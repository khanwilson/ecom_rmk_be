#!/bin/sh
set -e

cd /usr/src/product

# Check if package.json or yarn.lock changed compared to previous install
if [ -d "node_modules" ] && [ -f "node_modules/.yarn-integrity" ]; then
  # Check if package.json or yarn.lock is newer than yarn-integrity
  if [ "package.json" -nt "node_modules/.yarn-integrity" ] || \
     [ "yarn.lock" -nt "node_modules/.yarn-integrity" ] || \
     [ ! -f "yarn.lock" ]; then
    echo "🔄 package.json or yarn.lock changed, cleaning cache and reinstalling..."
    # Remove node_modules, yarn.lock and clear yarn cache
    # yarn cache clean @ecom-rmk/libs, cause yarn caches packages by name (@ecom-rmk/libs), not by version or file path. When using file: protocol.tgz
    rm -rf node_modules yarn.lock
    yarn cache clean @ecom-rmk/libs 2>/dev/null || true
    echo "📦 Installing product service dependencies..."
    yarn install
  else
    echo "✅ package.json and yarn.lock unchanged, skipping yarn install"
  fi
else
  echo "📦 Installing product service dependencies..."
  # Clean cache on first install to ensure fresh package
  yarn cache clean @ecom-rmk/libs 2>/dev/null || true
  yarn install
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

