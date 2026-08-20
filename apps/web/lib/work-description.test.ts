import { describe, expect, it } from 'vitest';
import { buildWorkDescriptionPreview } from './work-description';

describe('buildWorkDescriptionPreview', () => {
  it('turns Markdown into readable plain text without exposing link targets', () => {
    const markdown = [
      '# Proposal outcome',
      '',
      'Turn **discovery notes** into a [client-ready proposal](https://example.com/private) with `exact facts`.',
      '',
      '> Keep _names_ and ~~discarded~~ scope.',
    ].join('\n');

    expect(buildWorkDescriptionPreview(markdown, 300)).toEqual({
      summary:
        'Proposal outcome Turn discovery notes into a client-ready proposal with exact facts.',
      hasMore: true,
    });
  });

  it('keeps later instruction and example sections out of the calm preview', () => {
    const markdown = [
      'Find the strongest value moments and recommend practical improvements.',
      '',
      '**Instructions:**',
      'Keep every recommendation grounded in supplied evidence.',
      '',
      '**Three example user prompts:**',
      '1. Review these onboarding notes.',
      '2. Compare these renewal interviews.',
    ].join('\n');

    expect(buildWorkDescriptionPreview(markdown, 300)).toEqual({
      summary: 'Find the strongest value moments and recommend practical improvements.',
      hasMore: true,
    });
  });

  it('removes reference-style link definitions from previews', () => {
    const markdown = [
      'Follow the [private plan][plan] when preparing the review.',
      '',
      '[plan]: https://example.com/?token=secret',
    ].join('\n');

    expect(buildWorkDescriptionPreview(markdown, 300)).toEqual({
      summary: 'Follow the private plan when preparing the review.',
      hasMore: false,
    });
  });

  it('keeps ordinary inline emphasis in the leading summary', () => {
    expect(
      buildWorkDescriptionPreview(
        'Follow the **instructions** carefully to prepare a concise proposal.',
        300,
      ),
    ).toEqual({
      summary: 'Follow the instructions carefully to prepare a concise proposal.',
      hasMore: false,
    });
  });

  it('stays within the character bound and stops at the last complete word', () => {
    const preview = buildWorkDescriptionPreview('Alpha bravo charlie delta echo', 18);

    expect(preview).toEqual({ summary: 'Alpha bravo…', hasMore: true });
    expect(Array.from(preview.summary)).toHaveLength(12);
  });

  it('uses a Unicode-safe hard bound for one overlong token', () => {
    const preview = buildWorkDescriptionPreview('🚀'.repeat(20), 6);

    expect(preview).toEqual({ summary: '🚀🚀🚀🚀🚀…', hasMore: true });
    expect(Array.from(preview.summary)).toHaveLength(6);
  });

  it('returns an empty complete preview for absent copy', () => {
    expect(buildWorkDescriptionPreview(undefined)).toEqual({ summary: '', hasMore: false });
    expect(buildWorkDescriptionPreview('  \n\t  ')).toEqual({ summary: '', hasMore: false });
  });
});
