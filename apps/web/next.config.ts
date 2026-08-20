import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Pin Turbopack to this app so `tailwindcss` resolves from `apps/web/node_modules`.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
