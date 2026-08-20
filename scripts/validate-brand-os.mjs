#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

function parseArgs(argv) {
  const options = { mode: 'draft', root: '.' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--mode') options.mode = argv[index + 1];
    if (argv[index] === '--root') options.root = argv[index + 1];
  }
  return options;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function stableRecord(value) {
  return JSON.stringify(Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceLocation(root, path, source, index) {
  const line = source.slice(0, index).split('\n').length;
  return `${relative(root, path)}:${line}`;
}

function inspectSource(root, path, source, violations) {
  const addMatches = (pattern, ruleId, message) => {
    for (const match of source.matchAll(pattern)) {
      violations.push({
        ruleId,
        severity: 'error',
        location: sourceLocation(root, path, source, match.index ?? 0),
        message,
        blocking: true,
      });
    }
  };

  addMatches(/(?:linear|radial)-gradient/gi, 'surface.gradient', 'Use flat Brand OS surfaces without gradients.');
  addMatches(/—/g, 'copy.em-dash', 'Use direct US English without em dashes.');
  addMatches(
    /<(?:button|a|Link|summary|input|select|textarea)\b[^>]*(?:rounded-(?!none)[^\s"'}]+|border-radius\s*:\s*(?!0(?:px)?\b)[^;"'}]+)/gi,
    'shape.rounded-interactive',
    'Interactive elements must use the zero-radius structural shape.',
  );
  addMatches(
    /<(?:div|section|article|aside|header|footer|main|form)\b[^>]*rounded-(?!none)[^\s"'}]+/gi,
    'shape.rounded-structural',
    'Structural surfaces must use the zero-radius structural shape.',
  );
  for (const match of source.matchAll(/border-radius\s*:\s*([^;]+)/gi)) {
    const value = match[1].trim();
    if (/^(?:0(?:px)?|var\(--maslow-radius-(?:structural|capsule|circle)\))$/.test(value)) continue;
    violations.push({
      ruleId: 'shape.rounded-css',
      severity: 'error',
      location: sourceLocation(root, path, source, match.index ?? 0),
      message: 'CSS structural radius must resolve to zero.',
      blocking: true,
    });
  }
  if (/maslow/i.test(source) && /<svg\b|<linearGradient\b/i.test(source)) {
    violations.push({
      ruleId: 'asset.redrawn-logo',
      severity: 'error',
      location: relative(root, path),
      message: 'Use an immutable designer-supplied Maslow PNG master.',
      blocking: true,
    });
  }
}

const args = parseArgs(process.argv.slice(2));
const mode = args.mode;
const root = resolve(args.root);
const violations = [];
const add = (ruleId, location, message) => {
  violations.push({ ruleId, severity: 'error', location, message, blocking: true });
};

if (!['draft', 'release'].includes(mode)) {
  console.error('Usage: node scripts/validate-brand-os.mjs --mode draft|release --root <path>');
  process.exit(2);
}

const lockPath = join(root, 'brand-os.lock.json');
const manifestPath = join(root, 'vendor/maslow-brand-os/manifest.json');
let lock;
let manifest;
try {
  lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  add('package.missing', 'brand-os.lock.json', 'Brand OS lock and vendored manifest are required.');
}

if (lock && (lock.version !== '1.1.0' || lock.activeDependency !== 'file:vendor/maslow-brand-os')) {
  add('package.version', 'brand-os.lock.json', 'Pin @maslow-ai/brand-os to vendored version 1.1.0.');
}
if (manifest && manifest.version !== '1.1.0') {
  add('package.manifest-version', 'vendor/maslow-brand-os/manifest.json', 'Vendored manifest must be version 1.1.0.');
}
if (
  lock &&
  manifest &&
  (stableRecord(lock.sourceHashes) !== stableRecord(manifest.sourceHashes) ||
    stableRecord(lock.assetHashes) !== stableRecord(manifest.assetHashes))
) {
  add(
    'package.manifest-drift',
    'brand-os.lock.json',
    'Brand OS source and asset hashes must match the vendored manifest.',
  );
}

for (const logo of manifest?.logoAssets ?? []) {
  for (const path of [join(root, 'vendor/maslow-brand-os', logo.path), join(root, 'apps/web/public', logo.path)]) {
    if (!existsSync(path)) {
      add('asset.logo-missing', relative(root, path), 'Approved logo master is missing.');
    } else if (sha256(path) !== logo.sha256) {
      add('asset.logo-hash', relative(root, path), 'Approved logo master hash does not match the manifest.');
    }
  }
}

for (const [assetPath, expectedHash] of Object.entries(manifest?.assetHashes ?? {})) {
  const path = join(root, 'vendor/maslow-brand-os/assets', assetPath);
  if (!existsSync(path)) {
    add('asset.vendor-missing', relative(root, path), 'A locked Brand OS asset is missing from the vendor package.');
  } else if (sha256(path) !== expectedHash) {
    add('asset.vendor-hash', relative(root, path), 'A vendored Brand OS asset does not match its locked hash.');
  }
}

const sourcePaths = [
  ...walk(join(root, 'apps/web/app')),
  join(root, 'src/core/services/report-generation.service.ts'),
].filter(
  (path) =>
    existsSync(path) &&
    /\.(?:css|ts|tsx)$/.test(path) &&
    !/\.(?:test|spec)\.(?:ts|tsx)$/.test(path),
);
for (const path of sourcePaths) inspectSource(root, path, readFileSync(path, 'utf8'), violations);

const publicHomePath = join(root, 'apps/web/app/components/screens/PublicBetaHomeScreen.tsx');
if (existsSync(publicHomePath)) {
  const publicHome = readFileSync(publicHomePath, 'utf8');
  if (!publicHome.includes('AI employees for the work that waits on your busiest people.')) {
    add('copy.primary-position', relative(root, publicHomePath), 'External entry must include the exact primary Brand OS position.');
  }
}

const globalsPath = join(root, 'apps/web/app/globals.css');
if (!existsSync(globalsPath) || !readFileSync(globalsPath, 'utf8').includes("@import '@maslow-ai/brand-os/tokens.css'")) {
  add('token.import', 'apps/web/app/globals.css', 'Import the generated Brand OS token package.');
}

const legacyDashboardPath = join(root, 'public/index.html');
const serverEntryPath = join(root, 'src/index.ts');
if (
  existsSync(legacyDashboardPath) ||
  (existsSync(serverEntryPath) && /express\.static\(\s*['"]public['"]\s*\)/.test(readFileSync(serverEntryPath, 'utf8')))
) {
  add(
    'legacy.static-dashboard',
    existsSync(legacyDashboardPath) ? 'public/index.html' : 'src/index.ts',
    'The retired static dashboard must not be served as a default entry.',
  );
}

const report = {
  mode,
  input: relative(process.cwd(), root) || '.',
  blocking: mode === 'release' && violations.length > 0,
  violations: violations.map((violation) => ({
    ...violation,
    blocking: mode === 'release' && violation.blocking,
  })),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.blocking ? 1 : 0;
