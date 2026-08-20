import { describe, expect, it } from 'vitest';
import { extractPromptInputs, renderPrompt } from './work-library';

describe('extractPromptInputs', () => {
  it('turns repeated prompt variables into one friendly input definition each', () => {
    expect(
      extractPromptInputs(
        'Draft a proposal for {{client_name}} using {{discovery_notes}}. Address {{client_name}} directly.',
      ),
    ).toEqual([
      { key: 'client_name', label: 'Client name', kind: 'text', required: true },
      { key: 'discovery_notes', label: 'Discovery notes', kind: 'long_text', required: true },
    ]);
  });

  it('ignores malformed or unsafe variable names', () => {
    expect(extractPromptInputs('Use {{valid_name}}, {{ bad name }}, and {{token.secret}}.')).toEqual([
      { key: 'valid_name', label: 'Valid name', kind: 'text', required: true },
    ]);
  });
});

describe('renderPrompt', () => {
  it('renders the exact saved text while preserving inputs that were not supplied', () => {
    expect(
      renderPrompt('Write for {{client_name}} using {{discovery_notes}}.', {
        client_name: 'Northstar Health',
      }),
    ).toBe('Write for Northstar Health using {{discovery_notes}}.');
  });

  it('replaces every occurrence without rewriting surrounding prompt text', () => {
    expect(renderPrompt('{{topic}} first. Then revisit {{topic}}.', { topic: 'Governance' })).toBe(
      'Governance first. Then revisit Governance.',
    );
  });
});
