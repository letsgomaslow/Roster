#!/bin/bash

# MCP Prompts Monorepo Build Script
# Builds all packages in the correct order

set -e

echo "🏗️  Building MCP Prompts Monorepo..."

# Clean all packages first
echo "🧹 Cleaning all packages..."
pnpm -r run clean

# Build core packages first (dependencies)
echo "🔨 Building core packages..."
cd packages/core && pnpm run build && cd ../..
cd packages/@maslowai/contracts && pnpm run build && cd ../../..
cd packages/@maslowai/catalog && pnpm run build && cd ../../..

# Build adapters
echo "🔌 Building adapters..."
cd packages/adapters-file && pnpm run build && cd ../..
cd packages/adapters-memory && pnpm run build && cd ../..
cd packages/adapters-postgres && pnpm run build && cd ../..
cd packages/adapters-mcp && pnpm run build && cd ../..
cd packages/adapters-rest && pnpm run build && cd ../..
cd packages/adapters-cli && pnpm run build && cd ../..
cd packages/adapters-mdc && pnpm run build && cd ../..
cd packages/adapters-eta && pnpm run build && cd ../..

# Build server app
echo "🖥️  Building server app..."
cd apps/server && pnpm run build && cd ../..

# Build root package
echo "📦 Building root package..."
pnpm run build

echo "✅ Build completed successfully!"
echo "🎯 Run 'pnpm start' to start the server"
echo "🔍 Run 'pnpm test' to run tests"
