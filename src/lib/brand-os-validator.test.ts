import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];
const validator = resolve(process.cwd(), 'scripts/validate-brand-os.mjs');

function createFixture(source: string) {
  const root = mkdtempSync(join(tmpdir(), 'roster-brand-os-'));
  fixtures.push(root);
  mkdirSync(join(root, 'apps/web/app/components'), { recursive: true });
  mkdirSync(join(root, 'apps/web/public/assets/logos'), { recursive: true });
  mkdirSync(join(root, 'vendor/maslow-brand-os'), { recursive: true });
  writeFileSync(
    join(root, 'brand-os.lock.json'),
    JSON.stringify({
      activeDependency: 'file:vendor/maslow-brand-os',
      assetHashes: {},
      package: '@maslow-ai/brand-os',
      sourceHashes: {},
      version: '1.1.0',
    }),
  );
  writeFileSync(
    join(root, 'vendor/maslow-brand-os/manifest.json'),
    JSON.stringify({ assetHashes: {}, logoAssets: [], sourceHashes: {}, version: '1.1.0' }),
  );
  writeFileSync(join(root, 'apps/web/app/components/Screen.tsx'), source);
  writeFileSync(
    join(root, 'apps/web/app/globals.css'),
    "@import '@maslow-ai/brand-os/tokens.css';\n:root { --button-primary: var(--maslow-action-primary); }\n",
  );
  return root;
}

function runValidator(root: string) {
  return spawnSync(process.execPath, [validator, '--mode', 'release', '--root', root], {
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe('Brand OS validator', () => {
  it('accepts a square interface with the exact external position', () => {
    const root = createFixture(`export function Screen() {
      return <main><p>AI employees for the work that waits on your busiest people.</p><button>Start a working session</button></main>;
    }`);

    const result = runValidator(root);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ blocking: false, mode: 'release' });
  });

  it('blocks rounded interactions, gradients, em dashes, and redrawn Maslow marks', () => {
    const root = createFixture(`export function Screen() {
      return <button className="rounded-full bg-[linear-gradient(red,blue)]"><svg aria-label="Maslow logo" />Go — now</button>;
    }`);

    const result = runValidator(root);
    const report = JSON.parse(result.stdout) as { violations: Array<{ ruleId: string }> };
    const ruleIds = report.violations.map(({ ruleId }) => ruleId);

    expect(result.status).toBe(1);
    expect(ruleIds).toContain('shape.rounded-interactive');
    expect(ruleIds).toContain('surface.gradient');
    expect(ruleIds).toContain('copy.em-dash');
    expect(ruleIds).toContain('asset.redrawn-logo');
  });

  it('blocks drift between the lockfile and the vendored manifest', () => {
    const root = createFixture(`export function Screen() {
      return <main><p>AI employees for the work that waits on your busiest people.</p></main>;
    }`);
    writeFileSync(
      join(root, 'brand-os.lock.json'),
      JSON.stringify({
        activeDependency: 'file:vendor/maslow-brand-os',
        assetHashes: { 'tokens.css': 'changed' },
        package: '@maslow-ai/brand-os',
        sourceHashes: {},
        version: '1.1.0',
      }),
    );

    const result = runValidator(root);
    const report = JSON.parse(result.stdout) as { violations: Array<{ ruleId: string }> };

    expect(result.status).toBe(1);
    expect(report.violations.map(({ ruleId }) => ruleId)).toContain('package.manifest-drift');
  });

  it('blocks a vendored asset whose contents no longer match its hash', () => {
    const root = createFixture(`export function Screen() {
      return <main><p>AI employees for the work that waits on your busiest people.</p></main>;
    }`);
    const assetHashes = {
      'fonts/Manrope-Variable.ttf':
        'd0639be45d0af36e798172419d7bd173c4bd4f29e2b76cbb69db1d11bf8b0a40',
    };
    writeFileSync(
      join(root, 'brand-os.lock.json'),
      JSON.stringify({
        activeDependency: 'file:vendor/maslow-brand-os',
        assetHashes,
        package: '@maslow-ai/brand-os',
        sourceHashes: {},
        version: '1.1.0',
      }),
    );
    writeFileSync(
      join(root, 'vendor/maslow-brand-os/manifest.json'),
      JSON.stringify({ assetHashes, logoAssets: [], sourceHashes: {}, version: '1.1.0' }),
    );
    mkdirSync(join(root, 'vendor/maslow-brand-os/assets/fonts'), { recursive: true });
    writeFileSync(join(root, 'vendor/maslow-brand-os/assets/fonts/Manrope-Variable.ttf'), 'changed');

    const result = runValidator(root);
    const report = JSON.parse(result.stdout) as { violations: Array<{ ruleId: string }> };

    expect(result.status).toBe(1);
    expect(report.violations.map(({ ruleId }) => ruleId)).toContain('asset.vendor-hash');
  });

  it('blocks the retired static dashboard from becoming a default entry again', () => {
    const root = createFixture(`export function Screen() {
      return <main><p>AI employees for the work that waits on your busiest people.</p></main>;
    }`);
    mkdirSync(join(root, 'public'), { recursive: true });
    writeFileSync(join(root, 'public/index.html'), '<h1>Legacy dashboard</h1>');

    const result = runValidator(root);
    const report = JSON.parse(result.stdout) as { violations: Array<{ ruleId: string }> };

    expect(result.status).toBe(1);
    expect(report.violations.map(({ ruleId }) => ruleId)).toContain('legacy.static-dashboard');
  });
});
