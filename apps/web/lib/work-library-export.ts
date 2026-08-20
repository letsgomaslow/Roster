import { strToU8, zipSync } from 'fflate';

type ExportInput = {
  key: string;
  label: string;
  kind: string;
  required: boolean;
  options?: string[];
};

export type ExportAsset = {
  title: string;
  purpose?: string;
  kind: 'prompt' | 'playbook';
  teamKey?: string;
  jobKey?: string;
  reviewState: string;
  versionNumber: number;
  body: string;
  inputs: ExportInput[];
};

export type ExportTaxonomyLabels = {
  team?: string | null;
  job?: string | null;
};

function projectExportInput(input: ExportInput): ExportInput {
  return {
    key: input.key,
    label: input.label,
    kind: input.kind,
    required: input.required,
    ...(input.options ? { options: [...input.options] } : {}),
  };
}

function projectExportAsset(asset: ExportAsset): ExportAsset {
  return {
    title: asset.title,
    ...(nonBlank(asset.purpose) ? { purpose: asset.purpose } : {}),
    kind: asset.kind,
    ...(nonBlank(asset.teamKey) ? { teamKey: asset.teamKey } : {}),
    ...(nonBlank(asset.jobKey) ? { jobKey: asset.jobKey } : {}),
    reviewState: asset.reviewState,
    versionNumber: asset.versionNumber,
    body: asset.body,
    inputs: asset.inputs.map(projectExportInput),
  };
}

export function presentedAssetForExport(
  asset: ExportAsset,
  presented: Pick<ExportAsset, 'body' | 'inputs' | 'reviewState' | 'versionNumber'>,
): ExportAsset {
  return projectExportAsset({ ...asset, ...presented });
}

export function shouldRecordExportUse(mode: 'use' | 'review'): boolean {
  return mode === 'use';
}

export type AssetExport = {
  fileBase: string;
  json: string;
  markdown: string;
};

function readableLabel(value: string): string {
  const words = value.replaceAll('_', ' ').replaceAll('-', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function nonBlank(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function taxonomyLine(
  label: string,
  key?: string,
  resolvedLabel?: string | null,
): string | undefined {
  const stableKey = nonBlank(key);
  if (!stableKey || resolvedLabel === null) return undefined;
  return `**${label}:** ${nonBlank(resolvedLabel) ?? readableLabel(stableKey)}`;
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

function markdownType(kind: ExportAsset['kind']): string {
  return kind === 'prompt' ? 'AI work' : readableLabel(kind);
}

function markdownFor(asset: ExportAsset, labels: ExportTaxonomyLabels = {}): string {
  const purpose = nonBlank(asset.purpose);
  const taxonomyLines = [
    taxonomyLine('Team', asset.teamKey, labels.team),
    taxonomyLine('Work type', asset.jobKey, labels.job),
  ].filter((line): line is string => Boolean(line));

  return [
    `# ${asset.title}`,
    ...(purpose ? ['', purpose] : []),
    '',
    `**Type:** ${markdownType(asset.kind)}`,
    ...taxonomyLines,
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

export function buildAssetExport(
  asset: ExportAsset,
  labels: ExportTaxonomyLabels = {},
): AssetExport {
  const projected = projectExportAsset(asset);
  return {
    fileBase: safeFileBase(projected.title),
    json: JSON.stringify({ schemaVersion: 1, asset: projected }, null, 2),
    markdown: markdownFor(projected, labels),
  };
}

export function buildAssetZip(
  asset: ExportAsset,
  labels: ExportTaxonomyLabels = {},
): Uint8Array {
  const exported = buildAssetExport(asset, labels);
  return zipSync({
    [`${exported.fileBase}.json`]: strToU8(exported.json),
    [`${exported.fileBase}.md`]: strToU8(exported.markdown),
  });
}
