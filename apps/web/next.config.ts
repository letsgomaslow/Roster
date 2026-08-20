import type { NextConfig } from 'next';
import path from 'path';

const repoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: repoRoot,
  // The web app consumes generated Convex files and workspace dependencies from the repo root.
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
