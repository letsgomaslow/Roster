import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

type AxeNode = {
  html: string;
  target: string[];
  failureSummary?: string;
};

type AxeViolation = {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  help: string;
  nodes: AxeNode[];
};

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

function readAxeSource() {
  const pnpmDir = path.join(process.cwd(), 'node_modules', '.pnpm');
  const axeEntry = fs
    .readdirSync(pnpmDir)
    .find((entry) => entry.startsWith('axe-core@') && fs.existsSync(path.join(pnpmDir, entry, 'node_modules', 'axe-core', 'axe.min.js')));

  if (!axeEntry) {
    throw new Error('Unable to locate axe-core in node_modules/.pnpm');
  }

  return fs.readFileSync(path.join(pnpmDir, axeEntry, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
}

const axeSource = readAxeSource();

export async function injectAxe(page: Page) {
  await page.addScriptTag({ content: axeSource });
}

export async function expectNoBlockingAxeViolations(
  page: Page,
  options?: {
    include?: string[][];
    exclude?: string[][];
  },
) {
  await injectAxe(page);

  const results = await page.evaluate(async ({ include, exclude }) => {
    const axe = (
      window as unknown as Window & {
        axe: { run: (context?: unknown, options?: unknown) => Promise<unknown> };
      }
    ).axe;
    return (await axe.run(document, {
      include,
      exclude,
      resultTypes: ['violations'],
    })) as { violations: AxeViolation[] };
  }, options ?? {});

  const blockingViolations = results.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''));

  expect(
    blockingViolations,
    blockingViolations
      .map((violation) =>
        [
          `${violation.impact?.toUpperCase() ?? 'UNKNOWN'} ${violation.id}: ${violation.help}`,
          ...violation.nodes.slice(0, 3).map((node) =>
            `  ${node.target.join(' ')} :: ${node.failureSummary ?? node.html.slice(0, 160)}`,
          ),
        ].join('\n'),
      )
      .join('\n\n'),
  ).toEqual([]);
}
