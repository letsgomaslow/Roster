type ExportInput = {
  key: string;
  label: string;
  kind: string;
  required: boolean;
  options?: string[];
};

type ExportAsset = {
  title: string;
  purpose: string;
  kind: 'prompt' | 'playbook';
  teamKey: string;
  jobKey: string;
  reviewState: string;
  versionNumber: number;
  body: string;
  inputs: ExportInput[];
};

export type AssetExport = {
  fileBase: string;
  json: string;
  markdown: string;
};

function readableLabel(value: string): string {
  const words = value.replaceAll('_', ' ').replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function safeFileBase(title: string): string {
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'roster-asset';
}

function inputTable(inputs: ExportInput[]): string {
  if (!inputs.length) return '_No inputs required._';
  const rows = inputs.map(
    (input) =>
      `| \`${input.key}\` | ${input.label} | ${readableLabel(input.kind)} | ${input.required ? 'Yes' : 'No'} |`,
  );
  return ['| Key | Label | Type | Required |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function markdownFor(asset: ExportAsset): string {
  return [
    `# ${asset.title}`,
    '',
    asset.purpose,
    '',
    `**Type:** ${readableLabel(asset.kind)}`,
    `**Team:** ${readableLabel(asset.teamKey)}`,
    `**Job to be done:** ${readableLabel(asset.jobKey)}`,
    `**Trust state:** ${readableLabel(asset.reviewState)}`,
    `**Version:** ${asset.versionNumber}`,
    '',
    '## Inputs',
    '',
    inputTable(asset.inputs),
    '',
    '## Canonical content',
    '',
    asset.body,
    '',
  ].join('\n');
}

export function buildAssetExport(asset: ExportAsset): AssetExport {
  return {
    fileBase: safeFileBase(asset.title),
    json: JSON.stringify({ schemaVersion: 1, asset }, null, 2),
    markdown: markdownFor(asset),
  };
}

export function buildAssetZip(asset: ExportAsset): Uint8Array {
  const exported = buildAssetExport(asset);
  return zipSync({
    [`${exported.fileBase}.json`]: strToU8(exported.json),
    [`${exported.fileBase}.md`]: strToU8(exported.markdown),
  });
}
import { strToU8, zipSync } from 'fflate';
