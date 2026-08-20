import fs from 'node:fs';

import { expect, test } from '@playwright/test';
import { expectNoBlockingAxeViolations } from './a11y';

const storagePath = process.env.E2E_STORAGE_STATE;
const hasAuthenticatedStorage = Boolean(
  storagePath && fs.existsSync(storagePath) && fs.statSync(storagePath).isFile(),
);

const LONG_AI_WORK = [
  '<role>',
  'You are a value-delivery analyst. Identify the moments that create customer confidence, the weak points that interrupt momentum, and the smallest practical improvements that increase satisfaction without adding unnecessary complexity.',
  '</role>',
  '',
  '<context>',
  'You support founders, operators, and client-delivery teams. They may bring product journeys, service blueprints, discovery notes, interview transcripts, onboarding material, support themes, or renewal concerns. Treat their material as the source of truth. Separate evidence from assumptions and never invent missing facts.',
  '</context>',
  '',
  '<method>',
  ...Array.from({ length: 28 }, (_, index) =>
    `${index + 1}. Review the supplied material for value signal ${index + 1}. Explain what the customer is trying to accomplish, what helps or blocks progress, the evidence supporting the observation, the business consequence, and one proportionate next step. Keep the recommendation concrete enough that a nontechnical teammate can act on it.`,
  ),
  '</method>',
  '',
  '<output_format>',
  'Return an executive summary, a value-moment table, the three highest-confidence improvements, open questions, and a short measurement plan. Use plain language. Mark every inference clearly. Preserve names, numbers, dates, and quotations exactly as provided.',
  '</output_format>',
  '',
  '<constraints>',
  'Do not expose hidden reasoning. Do not claim that an action happened when it is only a recommendation. Do not rewrite source evidence. Do not ask the user to understand prompt syntax, model settings, or implementation details.',
  '</constraints>',
  '',
  'END-OF-EXACT-AI-WORK',
].join('\n');

const FORMATTED_DESCRIPTION = [
  '# Value delivery overview',
  '',
  'Use this work to find the customer moments that build confidence, the friction that interrupts progress, and the smallest practical improvements a nontechnical teammate can act on. Keep recommendations grounded in supplied evidence and mark assumptions clearly so the result is easy to trust and reuse.',
  '',
  '**Example prompts**',
  '1. Review these onboarding notes and identify the three value moments that matter most.',
  '2. Compare these renewal interviews and show where customer confidence drops.',
  '3. Turn these support themes into a short, evidence-based improvement plan.',
  '',
  '| Input | Example |',
  '| --- | --- |',
  '| Notes | Discovery notes |',
  '',
  '- [x] Preserve supplied evidence',
  '- [ ] Mark assumptions',
  '',
  '[Writing guidance](https://example.com/guidance)',
  '',
  '<script>alert("unsafe content")</script>',
  '![Tracking image](https://example.com/tracker.png)',
].join('\n');

test.describe('flexible AI work capture', () => {
  test.skip(!hasAuthenticatedStorage, 'Requires an authenticated workspace storage state.');

  test('saves, reopens, and copies a long body-only item exactly', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/library/new', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { level: 1, name: 'Start with the exact AI text' }),
    ).toBeVisible();

    await page
      .getByRole('textbox', {
        name: 'AI text',
      })
      .fill(LONG_AI_WORK);
    await page.getByRole('button', { name: 'Save private draft' }).click();

    await expect(page).toHaveURL(/\/library\/[^?]+\?saved=1$/);
    await expect(page.getByText('Saved to My Work', { exact: true })).toBeVisible();
    await expect(page.getByText('Organize this draft', { exact: true })).toBeVisible();

    await page.getByText('View exact AI work', { exact: true }).click();
    await expect(page.locator('pre')).toHaveText(LONG_AI_WORK);
    await page.getByRole('button', { name: 'Copy AI work' }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(LONG_AI_WORK);
  });

  test('adds workspace-specific optional categories without blocking save', async ({ page }) => {
    await page.goto('/library/new', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('textbox', {
        name: 'AI text',
      })
      .fill('Turn the supplied renewal notes into a concise, evidence-based renewal brief.');

    await page.getByText('Organize it (optional)', { exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill('Renewal brief builder');
    await page
      .getByRole('combobox', { name: 'Team', exact: true })
      .selectOption({ label: 'Add a new team' });
    await page
      .getByRole('textbox', { name: 'New team name', exact: true })
      .fill('Customer success');
    await page
      .getByRole('combobox', { name: 'Work type', exact: true })
      .selectOption({ label: 'Add a new work type' });
    await page
      .getByRole('textbox', { name: 'New work type name', exact: true })
      .fill('Create a renewal brief');
    await page.getByRole('button', { name: 'Save private draft' }).click();

    await expect(page).toHaveURL(/\/library\/[^?]+\?saved=1$/);
    await expect(
      page.getByRole('combobox', { name: 'Team', exact: true }),
    ).toHaveValue('customer-success');
    await expect(
      page.getByRole('combobox', { name: 'Work type', exact: true }),
    ).toHaveValue('create-a-renewal-brief');
  });

  test('keeps the optional disclosures keyboard-visible and mobile-safe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/library/new', { waitUntil: 'domcontentloaded' });
    const organize = page.getByText('Organize it (optional)', { exact: true });
    await organize.focus();
    await expect(organize).toBeFocused();
    const focusStyle = await organize.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(focusStyle.style).not.toBe('none');
    expect(focusStyle.width).toBeGreaterThanOrEqual(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false);
    await expectNoBlockingAxeViolations(page);
  });

  test('keeps a formatted long description calm and opens it in place', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const exactAiWork =
      'Review the supplied customer material and recommend evidence-based improvements.';
    await page.goto('/library/new', { waitUntil: 'domcontentloaded' });
    await page
      .getByRole('textbox', {
        name: 'AI text',
      })
      .fill(exactAiWork);
    await page.getByText('Organize it (optional)', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Value delivery guide');
    await page
      .getByRole('textbox', { name: /^Description/ })
      .fill(FORMATTED_DESCRIPTION);
    await page.getByRole('button', { name: 'Save private draft' }).click();

    await expect(page).toHaveURL(/\/library\/[^?]+\?saved=1$/);
    const trigger = page.getByRole('button', { name: 'Read full description' });
    await expect(trigger).toBeVisible();
    await expect(page.getByText('Example prompts', { exact: true })).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    const bodyOverflowBeforeOpen = await page.evaluate(() => document.body.style.overflow);
    const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'About this work' });
    await expect(dialog).toBeVisible();
    const dialogTitle = dialog.getByRole('heading', { level: 2, name: 'About this work' });
    await expect(dialogTitle).toBeFocused();
    await expect(dialog.getByRole('heading', { level: 3, name: 'Value delivery overview' })).toBeVisible();
    await expect(dialog.getByText('Example prompts', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('table')).toBeVisible();
    await expect(dialog.locator('script, img')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'Writing guidance' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Close description panel' })).toBeFocused();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    ).toBe(false);
    await expectNoBlockingAxeViolations(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(bodyOverflowBeforeOpen);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

    await page.getByText('View exact AI work', { exact: true }).click();
    await expect(page.locator('pre')).toHaveText(exactAiWork);
  });
});
