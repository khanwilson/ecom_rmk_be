#!/bin/sh
set -e

# Check if node_modules exists and has content
if [ -d "node_modules" ] && [ -n "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "📦 node_modules already exists, checking for updates..."
  # Check if package.json or yarn.lock changed
  if [ "package.json" -nt "node_modules/.yarn-integrity" ] || [ "yarn.lock" -nt "node_modules/.yarn-integrity" ]; then
    echo "🔄 package.json or yarn.lock changed, reinstalling..."
    yarn install --frozen-lockfile
  else
    echo "✅ Dependencies are up to date, skipping install"
  fi
else
  echo "📦 Installing root dependencies..."
  yarn install --frozen-lockfile
fi

echo "✅ Root dependencies ready"
exit 0

