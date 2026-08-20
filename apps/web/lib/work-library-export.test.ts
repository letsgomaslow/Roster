import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildAssetExport, buildAssetZip } from './work-library-export';

const asset = {
  title: 'Proposal drafter',
  purpose: 'Turn discovery notes into a proposal.',
  kind: 'prompt' as const,
  teamKey: 'client-delivery',
  jobKey: 'create-proposal',
  reviewState: 'team_approved',
  versionNumber: 3,
  body: 'Draft for {{client_name}} using {{discovery_notes}}.',
  inputs: [
    { key: 'client_name', label: 'Client name', kind: 'text' as const, required: true },
    {
      key: 'discovery_notes',
      label: 'Discovery notes',
      kind: 'long_text' as const,
      required: true,
    },
  ],
};

describe('buildAssetExport', () => {
  it('keeps the exact canonical body in an open JSON representation', () => {
    const exported = buildAssetExport(asset);
    expect(JSON.parse(exported.json)).toMatchObject({
      schemaVersion: 1,
      asset: {
        title: 'Proposal drafter',
        body: 'Draft for {{client_name}} using {{discovery_notes}}.',
        versionNumber: 3,
      },
    });
  });

  it('creates readable Markdown without dropping governance context', () => {
    const exported = buildAssetExport(asset);
    expect(exported.markdown).toContain('# Proposal drafter');
    expect(exported.markdown).toContain('**Trust state:** Team approved');
    expect(exported.markdown).toContain('Draft for {{client_name}} using {{discovery_notes}}.');
  });

  it('bundles both open representations in a portable ZIP', () => {
    const files = unzipSync(buildAssetZip(asset));
    expect(Object.keys(files).sort()).toEqual([
      'proposal-drafter.json',
      'proposal-drafter.md',
    ]);
    expect(strFromU8(files['proposal-drafter.json'])).toContain('"schemaVersion": 1');
    expect(strFromU8(files['proposal-drafter.md'])).toContain('# Proposal drafter');
  });
});
