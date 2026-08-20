#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] || join(root, '../../Maslow Design System'));
const sourcePackage = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
const sourceDist = join(source, 'dist/npm');
const destination = join(root, 'vendor/maslow-brand-os');

if (sourcePackage.version !== '1.1.0') {
  throw new Error(`Roster requires Brand OS 1.1.0, found ${sourcePackage.version}`);
}
if (!existsSync(join(sourceDist, 'manifest.json'))) {
  throw new Error(`Build Brand OS before syncing: ${sourceDist}`);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(sourceDist, destination, { recursive: true });

const vendorPackage = {
  name: '@maslow-ai/brand-os',
  version: sourcePackage.version,
  type: 'module',
  sideEffects: ['./tokens.css'],
  exports: {
    './tokens.css': './tokens.css',
    './tokens': { types: './tokens.d.ts', import: './tokens.js' },
    './assets/*': './assets/*',
    './manifest': { types: './manifest.d.ts', default: './manifest.json' },
  },
};
writeFileSync(join(destination, 'package.json'), `${JSON.stringify(vendorPackage, null, 2)}\n`);
writeFileSync(
  join(destination, 'manifest.d.ts'),
  `declare const manifest: {
  packageName: string;
  version: string;
  contractVersion: string;
  logoPolicy: "immutable-designer-master";
  logoAssets: Array<{
    id: string;
    path: string;
    sourceFilename: string;
    role: "complete-lockup" | "symbol" | "square-symbol";
    use: string;
    width: number;
    height: number;
    sha256: string;
  }>;
  sourceHashes: Record<string, string>;
  assetHashes: Record<string, string>;
};
export default manifest;
`,
);

const manifest = JSON.parse(readFileSync(join(destination, 'manifest.json'), 'utf8'));
const publicLogoDirectory = join(root, 'apps/web/public/assets/logos');
rmSync(publicLogoDirectory, { recursive: true, force: true });
mkdirSync(publicLogoDirectory, { recursive: true });
for (const logo of manifest.logoAssets) {
  cpSync(join(destination, logo.path), join(root, 'apps/web/public', logo.path));
}

const lock = {
  package: sourcePackage.name,
  version: sourcePackage.version,
  activeDependency: 'file:vendor/maslow-brand-os',
  releaseDependency: `github:letsgomaslow/mai-design-system#v${sourcePackage.version}`,
  logoPolicy: manifest.logoPolicy,
  logoAssets: manifest.logoAssets,
  sourceHashes: manifest.sourceHashes,
  assetHashes: manifest.assetHashes,
};
writeFileSync(join(root, 'brand-os.lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Synced ${sourcePackage.name} ${sourcePackage.version} into vendor/maslow-brand-os`);
