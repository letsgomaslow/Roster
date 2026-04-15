#!/bin/bash
# Publish @maslowai/roster to GitHub Packages (configure org mapping in GitHub/npm)

set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "Error: GITHUB_TOKEN environment variable not set"
    echo "Set it with: export GITHUB_TOKEN=your_token"
    exit 1
fi

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
    VERSION=$(node -p "require('./package.json').version")
fi

echo "Publishing @maslowai/roster@${VERSION} to GitHub Packages..."

cp .npmrc.github .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc

echo "Building package..."
pnpm run build

echo "Publishing to GitHub Packages..."
npm publish --registry https://npm.pkg.github.com

echo "✓ Successfully published @maslowai/roster@${VERSION}"
echo ""
echo "Install with:"
echo "  npm install @maslowai/roster@${VERSION} --registry https://npm.pkg.github.com"
echo ""
echo "Or add to .npmrc:"
echo "  @maslowai:registry=https://npm.pkg.github.com"
