import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import {
  buildAssetExport,
  buildAssetZip,
  presentedAssetForExport,
  shouldRecordExportUse,
} from './work-library-export';

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

const unclassifiedAsset = {
  title: 'Keep this body exact',
  kind: 'prompt' as const,
  reviewState: 'draft',
  versionNumber: 1,
  body: '  First line\n\nKeep {{spacing}} exactly.  ',
  inputs: [],
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
    expect(exported.markdown).toContain('**Type:** AI work');
    expect(exported.markdown).toContain('**Trust state:** Team approved');
    expect(exported.markdown).toContain('Draft for {{client_name}} using {{discovery_notes}}.');
    expect(JSON.parse(exported.json).asset.kind).toBe('prompt');
  });

  it('omits optional metadata that was not supplied from JSON', () => {
    const exportedAsset = JSON.parse(buildAssetExport(unclassifiedAsset).json).asset;

    expect(exportedAsset).not.toHaveProperty('purpose');
    expect(exportedAsset).not.toHaveProperty('teamKey');
    expect(exportedAsset).not.toHaveProperty('jobKey');
    expect(exportedAsset.body).toBe(unclassifiedAsset.body);
  });

  it('omits absent purpose and taxonomy lines from Markdown without changing the body', () => {
    const markdown = buildAssetExport(unclassifiedAsset).markdown;

    expect(markdown).not.toContain('**Team:**');
    expect(markdown).not.toContain('**Work type:**');
    expect(markdown).not.toMatch(/undefined|uncategorized/i);
    expect(markdown).toContain(`## Canonical content\n\n${unclassifiedAsset.body}\n`);
  });

  it('uses resolved taxonomy labels in Markdown while retaining stable keys in JSON', () => {
    const exported = buildAssetExport(asset, {
      team: 'Client success',
      job: 'Renewal planning',
    });
    const jsonAsset = JSON.parse(exported.json).asset;

    expect(exported.markdown).toContain('**Team:** Client success');
    expect(exported.markdown).toContain('**Work type:** Renewal planning');
    expect(jsonAsset.teamKey).toBe('client-delivery');
    expect(jsonAsset.jobKey).toBe('create-proposal');
    expect(jsonAsset).not.toHaveProperty('teamLabel');
    expect(jsonAsset).not.toHaveProperty('jobLabel');
  });

  it('keeps readable stable-key labels when no taxonomy override is supplied', () => {
    const markdown = buildAssetExport(asset).markdown;

    expect(markdown).toContain('**Team:** Client delivery');
    expect(markdown).toContain('**Work type:** Create proposal');
  });

  it('intentionally omits unresolved taxonomy lines while retaining stable JSON keys', () => {
    const exported = buildAssetExport(asset, { team: null, job: null });
    const jsonAsset = JSON.parse(exported.json).asset;

    expect(exported.markdown).not.toContain('**Team:**');
    expect(exported.markdown).not.toContain('**Work type:**');
    expect(exported.markdown).not.toMatch(/client-delivery|create-proposal/i);
    expect(jsonAsset.teamKey).toBe('client-delivery');
    expect(jsonAsset.jobKey).toBe('create-proposal');
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

  it('bundles the same clean labeled JSON and Markdown representations in the ZIP', () => {
    const labels = { team: 'Client success', job: 'Renewal planning' };
    const exported = buildAssetExport(asset, labels);
    const files = unzipSync(buildAssetZip(asset, labels));

    expect(strFromU8(files['proposal-drafter.json'])).toBe(exported.json);
    expect(strFromU8(files['proposal-drafter.md'])).toBe(exported.markdown);
  });

  it('keeps intentional taxonomy omissions consistent inside the ZIP', () => {
    const labels = { team: null, job: null };
    const exported = buildAssetExport(asset, labels);
    const files = unzipSync(buildAssetZip(asset, labels));

    expect(strFromU8(files['proposal-drafter.json'])).toBe(exported.json);
    expect(strFromU8(files['proposal-drafter.md'])).toBe(exported.markdown);
    expect(strFromU8(files['proposal-drafter.md'])).not.toContain('**Team:**');
    expect(strFromU8(files['proposal-drafter.md'])).not.toContain('**Work type:**');
  });

  it('exports the exact version presented in a focused review', () => {
    const reviewed = presentedAssetForExport(asset, {
      body: 'Pending version shown to the reviewer.',
      inputs: [],
      reviewState: 'shared',
      versionNumber: 4,
    });
    const exported = buildAssetExport(reviewed);

    expect(JSON.parse(exported.json).asset).toMatchObject({
      body: 'Pending version shown to the reviewer.',
      reviewState: 'shared',
      versionNumber: 4,
    });
    expect(exported.markdown).not.toContain(asset.body);
  });

  it('projects rich screen data onto the public export contract at runtime', () => {
    const richScreenAsset = {
      ...asset,
      approvals: [{ note: 'Internal approval evidence' }],
      comments: [{ body: 'Internal feedback' }],
      ownerUserId: 'user-internal-123',
      pendingVersion: { body: 'Hidden replacement draft', versionNumber: 4 },
    };
    const reviewed = presentedAssetForExport(richScreenAsset, {
      body: 'Exact version shown to the user.',
      inputs: [],
      reviewState: 'team_approved',
      versionNumber: 3,
    });
    const jsonAsset = JSON.parse(buildAssetExport(reviewed).json).asset;

    expect(Object.keys(jsonAsset).sort()).toEqual([
      'body',
      'inputs',
      'jobKey',
      'kind',
      'purpose',
      'reviewState',
      'teamKey',
      'title',
      'versionNumber',
    ]);
    expect(jsonAsset.body).toBe('Exact version shown to the user.');
    expect(JSON.stringify(jsonAsset)).not.toMatch(
      /Hidden replacement draft|user-internal-123|Internal approval|Internal feedback/,
    );
  });

  it('counts normal-use exports without treating review downloads as adoption', () => {
    expect(shouldRecordExportUse('use')).toBe(true);
    expect(shouldRecordExportUse('review')).toBe(false);
  });
});
