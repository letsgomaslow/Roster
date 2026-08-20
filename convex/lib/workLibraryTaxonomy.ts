import { v, type Infer } from 'convex/values';

export const taxonomyKindValidator = v.union(v.literal('team'), v.literal('work_type'));
export const taxonomyStatusValidator = v.union(v.literal('active'), v.literal('archived'));

export type TaxonomyKind = Infer<typeof taxonomyKindValidator>;

export const DEFAULT_TAXONOMY_TERMS: ReadonlyArray<{
  kind: TaxonomyKind;
  key: string;
  label: string;
}> = [
  { kind: 'team', key: 'client-delivery', label: 'Client delivery' },
  { kind: 'team', key: 'marketing', label: 'Marketing' },
  { kind: 'team', key: 'business-development', label: 'Business development' },
  { kind: 'team', key: 'operations', label: 'Operations' },
  { kind: 'work_type', key: 'create-proposal', label: 'Create a proposal' },
  { kind: 'work_type', key: 'draft-sow', label: 'Draft a statement of work' },
  { kind: 'work_type', key: 'research-account', label: 'Research an account' },
  { kind: 'work_type', key: 'summarize-meeting', label: 'Summarize a meeting' },
  { kind: 'work_type', key: 'create-campaign', label: 'Create a campaign' },
];

export function cleanTaxonomyLabel(value: string): string {
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Taxonomy label is required');
  if (label.length > 120) throw new Error('Taxonomy label must be 120 characters or fewer');
  return label;
}

export function normalizeTaxonomyLabel(value: string): string {
  return cleanTaxonomyLabel(value).normalize('NFKC').toLocaleLowerCase('en-US');
}

export function taxonomyKey(value: string): string {
  return normalizeTaxonomyLabel(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'term';
}

export function fallbackDraftTitle(now: number): string {
  return `Saved AI work · ${new Date(now).toISOString().slice(0, 10)}`;
}

export function optionalMetadataText(
  value: string | undefined,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength.toLocaleString('en-US')} characters or fewer`);
  }
  return normalized;
}

export function boundedSearchText(parts: Array<string | undefined>, maxBytes = 32_000): string {
  const text = parts.filter((part): part is string => Boolean(part)).join(' ').toLocaleLowerCase();
  const encoded = new TextEncoder().encode(text);
  if (encoded.byteLength <= maxBytes) return text;
  const encoder = new TextEncoder();
  let bounded = new TextDecoder().decode(encoded.slice(0, maxBytes));
  while (encoder.encode(bounded).byteLength > maxBytes) bounded = bounded.slice(0, -1);
  return bounded;
}
