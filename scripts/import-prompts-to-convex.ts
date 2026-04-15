/**
 * Bulk-import local JSON prompts into Convex (mutation prompts:importBulk).
 *
 * Usage:
 *   CONVEX_URL=https://....convex.cloud \
 *   IMPORT_SECRET=... \
 *   OWNER_USER_ID=user_... \
 *   pnpm exec ts-node scripts/import-prompts-to-convex.ts
 *
 * Set IMPORT_SECRET in Convex dashboard to match. OWNER_USER_ID is your Clerk user id,
 * or the same value as CONVEX_DEV_OWNER_USER_ID when not using Clerk.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type { ConvexPromptDoc } from '../src/adapters/convex/convex-prompt-mapper';

const mImport = makeFunctionReference<'mutation'>('prompts:importBulk');

function walkJsonFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...walkJsonFiles(full));
    else if (name.isFile() && name.name.endsWith('.json') && name.name !== 'index.json') {
      out.push(full);
    }
  }
  return out;
}

function fileToDoc(raw: Record<string, unknown>, ownerUserId: string): ConvexPromptDoc {
  const id = (raw.id as string) || 'unknown';
  const now = Date.now();
  const template =
    (raw.template as string) || (raw.content as string) || (raw.system_prompt as string) || '';
  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
  const variables = Array.isArray(raw.variables) ? (raw.variables as unknown[]) : [];
  const agentConfig = raw.agentConfig as ConvexPromptDoc['agentConfig'];
  return {
    promptId: id,
    ownerUserId,
    name: (raw.name as string) || id,
    description: (raw.description as string) || '',
    template,
    category: (raw.category as string) || 'general',
    tags,
    variables,
    version: String(raw.version ?? '1'),
    createdAt: raw.createdAt ? new Date(raw.createdAt as string).getTime() : now,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string).getTime() : now,
    isLatest: raw.isLatest !== false,
    metadata: (raw.metadata as Record<string, unknown>) || {},
    accessLevel: (raw.accessLevel as string) || (raw.access_level as string) || 'public',
    authorId: (raw.authorId as string) || (raw.author_id as string) || ownerUserId,
    promptType: (raw.promptType as string) || 'standard',
    agentConfig,
    libraryFormat: 1,
    artifactKind: (raw.artifactKind as string) || 'prompt',
  };
}

async function main() {
  const convexUrl = process.env.CONVEX_URL;
  const secret = process.env.IMPORT_SECRET;
  const ownerUserId = process.env.OWNER_USER_ID;
  const promptsDir = process.env.PROMPTS_DIR || path.join(process.cwd(), 'data', 'prompts');

  if (!convexUrl || !secret || !ownerUserId) {
    console.error('Missing CONVEX_URL, IMPORT_SECRET, or OWNER_USER_ID');
    process.exit(1);
  }

  const files = walkJsonFiles(promptsDir);
  const prompts: ConvexPromptDoc[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(f, 'utf8')) as Record<string, unknown>;
      prompts.push(fileToDoc(raw, ownerUserId));
    } catch (e) {
      console.warn('Skip', f, e);
    }
  }

  const client = new ConvexHttpClient(convexUrl, { logger: false });
  const result = await client.mutation(mImport, { secret, ownerUserId, prompts });
  console.log('Import result:', result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
