import { describe, expect, it } from 'vitest';
import { Prompt } from '../../core/entities/prompt.entity';
import { convexDocToPrompt, promptToConvexDoc, type ConvexPromptDoc } from './convex-prompt-mapper';

describe('convex-prompt-mapper', () => {
  it('round-trips template and identity fields', () => {
    const p = new Prompt(
      'my-id',
      'Name',
      'Desc',
      'Hello {{x}}',
      'cat',
      ['t1'],
      ['x'],
      '1.0.0',
      new Date('2020-01-01'),
      new Date('2020-01-02'),
      true,
      { k: 1 },
      'public',
      'author1',
      'standard',
      undefined,
    );
    const doc = promptToConvexDoc(p, 'owner_abc');
    expect(doc.promptId).toBe('my-id');
    expect(doc.ownerUserId).toBe('owner_abc');
    expect(doc.template).toBe('Hello {{x}}');
    const back = convexDocToPrompt(doc as ConvexPromptDoc);
    expect(back.id).toBe('my-id');
    expect(back.template).toBe('Hello {{x}}');
  });

  it('maps agentConfig lastExecutedAt from number', () => {
    const doc: ConvexPromptDoc = {
      promptId: 'a',
      ownerUserId: 'o',
      name: 'n',
      description: '',
      template: 't',
      category: 'c',
      tags: [],
      variables: [],
      version: '1',
      createdAt: 0,
      updatedAt: 0,
      isLatest: true,
      metadata: {},
      accessLevel: 'public',
      promptType: 'subagent_registry',
      agentConfig: { model: 'claude-haiku', lastExecutedAt: 1700000000000 },
      libraryFormat: 1,
    };
    const p = convexDocToPrompt(doc);
    expect(p.agentConfig?.lastExecutedAt?.getTime()).toBe(1700000000000);
  });
});
