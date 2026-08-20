export type WorkDescriptionPreview = {
  summary: string;
  hasMore: boolean;
};

const secondarySectionPattern =
  /(?:^|\n)\s*(?:#{1,6}\s+)?(?:\*\*|__)?(?:(?:one|two|three|four|five|\d+)\s+)?(?:examples?(?:\s+user)?\s+prompts?|examples?|instructions?|how\s+to\s+use|usage)\s*:?(?:\*\*|__)?\s*:?(?=\n|$)|\s+(?:\*\*|__)(?:(?:one|two|three|four|five|\d+)\s+)?(?:examples?(?:\s+user)?\s+prompts?|examples?|instructions?|how\s+to\s+use|usage)(?:\s*:(?:\*\*|__)|(?:\*\*|__)\s*:)/im;

function sanitizePreviewSource(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/^\s{0,3}\[[^\]\n]+\]:\s*\S+(?:\s+.*)?$/gm, ' ')
    .trim();
}

function selectLeadMarkdown(markdown: string): { markdown: string; hasMore: boolean } {
  const sanitized = sanitizePreviewSource(markdown);
  const sectionMatch = secondarySectionPattern.exec(sanitized);
  const beforeSecondarySection = sectionMatch && sectionMatch.index > 0
    ? sanitized.slice(0, sectionMatch.index).trim()
    : sanitized;
  const blocks = beforeSecondarySection.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) return { markdown: '', hasMore: false };

  const headingFirst = /^\s{0,3}#{1,6}\s+\S[^\n]*$/.test(blocks[0]);
  const selectedCount = headingFirst && blocks.length > 1 ? 2 : 1;
  return {
    markdown: blocks.slice(0, selectedCount).join('\n\n'),
    hasMore: Boolean(
      (sectionMatch && sectionMatch.index > 0) || blocks.length > selectedCount,
    ),
  };
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^\s{0,3}(?:`{3,}|~{3,})[^\n]*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gi, '$1')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/^\s{0,3}(?:#{1,6}\s+|(?:>\s*)+|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/^\s*[=_*-]{3,}\s*$/gm, ' ')
    .replace(/`+([^`]+?)`+/g, '$1')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(^|[\s([{])([*_])(?=\S)([^*_]*?\S)\2(?=$|[\s)\]}.,!?;:])/g, '$1$3')
    .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncatePreview(plainText: string, maxLength: number): WorkDescriptionPreview {
  const characters = Array.from(plainText);
  if (characters.length <= maxLength) return { summary: plainText, hasMore: false };
  if (maxLength === 0) return { summary: '', hasMore: true };
  if (maxLength === 1) return { summary: '…', hasMore: true };

  const prefix = characters.slice(0, maxLength - 1).join('');
  const nextCharacter = characters[maxLength - 1];
  const lastSpace = prefix.lastIndexOf(' ');
  const wordSafePrefix = /\s/.test(nextCharacter) || lastSpace < 1
    ? prefix.trimEnd()
    : prefix.slice(0, lastSpace);
  return { summary: `${wordSafePrefix}…`, hasMore: true };
}

export function buildWorkDescriptionPreview(
  markdown: string | null | undefined,
  maxLength = 240,
): WorkDescriptionPreview {
  const lead = selectLeadMarkdown(markdown ?? '');
  const plainText = markdownToPlainText(lead.markdown);
  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : 240;
  const truncated = truncatePreview(plainText, limit);
  return { summary: truncated.summary, hasMore: lead.hasMore || truncated.hasMore };
}
