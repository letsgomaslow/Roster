export type PromptInputDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'long_text';
  required: true;
};

const LONG_TEXT_HINTS = ['brief', 'content', 'context', 'notes', 'requirements', 'transcript'];
const VARIABLE_PATTERN = /\{\{([a-z][a-z0-9_]{0,63})\}\}/g;

function inputLabel(key: string): string {
  const words = key.replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function inputKind(key: string): PromptInputDefinition['kind'] {
  return LONG_TEXT_HINTS.some((hint) => key.includes(hint)) ? 'long_text' : 'text';
}

export function extractPromptInputs(body: string): PromptInputDefinition[] {
  const keys = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    keys.add(match[1]);
  }
  return [...keys].map((key) => ({
    key,
    label: inputLabel(key),
    kind: inputKind(key),
    required: true,
  }));
}

export function renderPrompt(body: string, values: Record<string, string>): string {
  return body.replace(VARIABLE_PATTERN, (token, key: string) => values[key] ?? token);
}
