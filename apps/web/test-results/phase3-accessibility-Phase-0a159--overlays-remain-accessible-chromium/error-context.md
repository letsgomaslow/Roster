# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3-accessibility.spec.ts >> Phase 3 accessibility >> desktop overlays remain accessible
- Location: e2e/phase3-accessibility.spec.ts:27:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: /command palette/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: /command palette/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - complementary "Primary navigation" [ref=e5]:
      - link "Go to the Roster home screen" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]:
          - img [ref=e9]
          - generic [ref=e12]:
            - generic [ref=e13]:
              - generic [ref=e14]: Maslow
              - generic [ref=e15]: "|"
              - generic [ref=e16]: AI
            - generic [ref=e17]:
              - generic [ref=e18]: Roster
              - generic [ref=e19]: Beta
      - navigation "Primary" [ref=e20]:
        - link "Home Overview" [ref=e21] [cursor=pointer]:
          - /url: /
          - paragraph [ref=e22]: Home
          - paragraph [ref=e23]: Overview
        - link "Library Prompts" [ref=e24] [cursor=pointer]:
          - /url: /library
          - paragraph [ref=e25]: Library
          - paragraph [ref=e26]: Prompts
        - link "Agents Catalog" [ref=e27] [cursor=pointer]:
          - /url: /agents
          - paragraph [ref=e28]: Agents
          - paragraph [ref=e29]: Catalog
        - link "Runs Execution" [ref=e30] [cursor=pointer]:
          - /url: /runs
          - paragraph [ref=e31]: Runs
          - paragraph [ref=e32]: Execution
        - link "Integrations MCP setup" [ref=e33] [cursor=pointer]:
          - /url: /integrations
          - paragraph [ref=e34]: Integrations
          - paragraph [ref=e35]: MCP setup
        - link "Settings Usage" [ref=e36] [cursor=pointer]:
          - /url: /settings
          - paragraph [ref=e37]: Settings
          - paragraph [ref=e38]: Usage
      - generic [ref=e39]:
        - paragraph [ref=e40]: Beta posture
        - paragraph [ref=e41]: Fast path for Claude Desktop, Cursor, and any MCP-compatible host.
        - paragraph [ref=e42]: The web app mirrors the MCP server surface, so the shortest route from setup to feedback stays inside one control plane.
        - button "Send beta feedback" [ref=e43]
      - generic [ref=e45]:
        - paragraph [ref=e46]: Auth disabled
        - paragraph [ref=e47]: "Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/web/.env.local` to enable Clerk without keyless development mode."
    - main [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e51]:
          - paragraph [ref=e52]: Control plane
          - paragraph [ref=e53]: Operational overview
        - generic [ref=e54]:
          - button "Open command palette" [active] [ref=e55]:
            - text: Search
            - generic [ref=e56]: ⌘K
          - button "Feedback" [ref=e57]
      - generic [ref=e59]:
        - generic [ref=e60]:
          - generic [ref=e61]:
            - paragraph [ref=e62]: Operational Overview
            - generic [ref=e63]:
              - heading "Private beta control plane for the Roster MCP server" [level=1] [ref=e64]
              - paragraph [ref=e65]: Roster should read like a working control plane, not a landing page. This view keeps connection status and workspace momentum side by side so beta users can tell whether the MCP server is ready and whether their library is actually moving.
          - generic [ref=e66]:
            - link "Finish MCP setup" [ref=e67] [cursor=pointer]:
              - /url: /integrations
            - link "New prompt" [ref=e68] [cursor=pointer]:
              - /url: /library/new
        - generic [ref=e69]:
          - generic [ref=e70]:
            - generic [ref=e71]:
              - generic [ref=e72]:
                - heading "Integration readiness" [level=2] [ref=e73]
                - paragraph [ref=e74]: The shortest path to useful feedback starts with proving setup, tool availability, and usage limits from one screen.
              - generic [ref=e75]: Needs attention
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e78]:
                  - paragraph [ref=e79]: Server health
                  - paragraph [ref=e80]: Check
                  - paragraph [ref=e81]: Health check is not healthy yet.
                - generic [ref=e82]:
                  - paragraph [ref=e83]: Available tools
                  - paragraph [ref=e84]: "0"
                  - paragraph [ref=e85]: Listed from the MCP tool endpoint.
                - generic [ref=e86]:
                  - paragraph [ref=e87]: Rate window
                  - paragraph [ref=e88]: Unknown
                  - paragraph [ref=e89]: Plan unavailable
              - generic [ref=e90]:
                - generic [ref=e91]:
                  - paragraph [ref=e92]: Quick-start clients
                  - generic [ref=e93]:
                    - link "Claude Desktop Generate a desktop config and test one tool call." [ref=e94] [cursor=pointer]:
                      - /url: /integrations#claude
                      - paragraph [ref=e95]: Claude Desktop
                      - paragraph [ref=e96]: Generate a desktop config and test one tool call.
                    - link "Cursor Use the same server definition with the beta-friendly copy path." [ref=e97] [cursor=pointer]:
                      - /url: /integrations#cursor
                      - paragraph [ref=e98]: Cursor
                      - paragraph [ref=e99]: Use the same server definition with the beta-friendly copy path.
                    - link "Generic host Keep a JSON reference ready for any MCP-compatible runtime." [ref=e100] [cursor=pointer]:
                      - /url: /integrations#generic
                      - paragraph [ref=e101]: Generic host
                      - paragraph [ref=e102]: Keep a JSON reference ready for any MCP-compatible runtime.
                - generic [ref=e103]:
                  - paragraph [ref=e104]: MCP readiness checklist
                  - generic [ref=e105]:
                    - generic [ref=e106]:
                      - generic [ref=e107]: "Server responds to `/health`"
                      - generic [ref=e108]: Missing
                    - generic [ref=e109]:
                      - generic [ref=e110]: MCP tools are discoverable
                      - generic [ref=e111]: Missing
                    - generic [ref=e112]:
                      - generic [ref=e113]: Prompt catalog is loaded
                      - generic [ref=e114]: Missing
                    - generic [ref=e115]:
                      - generic [ref=e116]: Usage state is visible
                      - generic [ref=e117]: Missing
          - generic [ref=e118]:
            - generic [ref=e120]:
              - heading "Workspace activity" [level=2] [ref=e121]
              - paragraph [ref=e122]: Use these cards to spot whether the beta user is actually creating, editing, and running anything.
            - generic [ref=e124]:
              - generic [ref=e125]:
                - paragraph [ref=e126]: Library items
                - paragraph [ref=e127]: "0"
                - paragraph [ref=e128]: Direct Convex read
              - generic [ref=e129]:
                - paragraph [ref=e130]: Feedback signals
                - paragraph [ref=e131]: "0"
                - paragraph [ref=e132]: Recent feedback count
              - generic [ref=e133]:
                - paragraph [ref=e134]: Agents registered
                - paragraph [ref=e135]: "0"
                - paragraph [ref=e136]: Non-standard prompts
              - generic [ref=e137]:
                - paragraph [ref=e138]: Runs tracked
                - paragraph [ref=e139]: "0"
                - paragraph [ref=e140]: From the orchestration endpoint
        - generic [ref=e141]:
          - generic [ref=e142]:
            - generic [ref=e143]:
              - generic [ref=e144]:
                - heading "Recent prompts" [level=2] [ref=e145]
                - paragraph [ref=e146]: Convex-backed recent activity keeps the control plane responsive while BFF routes stay reserved for side effects.
              - link "Open library" [ref=e147] [cursor=pointer]:
                - /url: /library
            - generic [ref=e149]:
              - paragraph [ref=e150]: Prompt activity has not started
              - paragraph [ref=e151]: No prompt activity is visible yet. The beta user should be able to create, edit, and apply a template without leaving the web app.
              - link "Create the first prompt" [ref=e153] [cursor=pointer]:
                - /url: /library/new
          - generic [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]:
                - heading "Recent runs" [level=2] [ref=e157]
                - paragraph [ref=e158]: The orchestration list should immediately tell you whether the backend is producing traceable work.
              - link "Open runs" [ref=e159] [cursor=pointer]:
                - /url: /runs
            - generic [ref=e161]:
              - paragraph [ref=e162]: No run history yet
              - paragraph [ref=e163]: No orchestration runs are visible yet. The beta needs a working path from starting a run to opening its report.
              - link "Start orchestration" [ref=e165] [cursor=pointer]:
                - /url: /runs
          - generic [ref=e166]:
            - generic [ref=e168]:
              - heading "Usage and catalog signals" [level=2] [ref=e169]
              - paragraph [ref=e170]: These cards make the premium surface feel informed instead of ornamental.
            - generic [ref=e172]:
              - generic [ref=e173]:
                - paragraph [ref=e174]: Plan
                - paragraph [ref=e175]: Unavailable
                - paragraph [ref=e176]: Rate limit details are not currently available.
              - paragraph [ref=e178]: Library mix
              - generic [ref=e179]:
                - paragraph [ref=e180]: Agent health
                - paragraph [ref=e181]: Subagent statistics are not available yet.
    - complementary "Control plane guidance" [ref=e182]:
      - generic [ref=e183]:
        - generic [ref=e184]:
          - paragraph [ref=e185]: Navigation model
          - paragraph [ref=e186]: Setup on the left, execution in the center, recovery on the right.
          - paragraph [ref=e187]: Each page keeps one primary action visible and routes secondary friction into the feedback drawer instead of hiding it behind docs.
        - generic [ref=e188]:
          - paragraph [ref=e189]: Beta rubric
          - list [ref=e190]:
            - listitem [ref=e191]: 1. Setup must finish without opening repository docs.
            - listitem [ref=e192]: 2. Prompt edits must land in under three steps.
            - listitem [ref=e193]: 3. Every backend capability needs an obvious UI entry point.
        - generic [ref=e194]:
          - paragraph [ref=e195]: Quick keys
          - generic [ref=e196]:
            - paragraph [ref=e197]:
              - generic [ref=e198]: Open command palette
              - generic [ref=e199]: ⌘K
            - paragraph [ref=e200]:
              - generic [ref=e201]: Open feedback drawer
              - generic [ref=e202]: UI
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { expectNoBlockingAxeViolations } from './a11y';
  3  | 
  4  | const ROUTES = [
  5  |   { path: '/', heading: /Private beta control plane for the Roster MCP server/i },
  6  |   { path: '/library', heading: /Prompt search, filtering, and beta-ready editing/i },
  7  |   { path: '/library/new', heading: /New prompt/i },
  8  |   { path: '/agents', heading: /Subagents and main agents in one navigation path/i },
  9  |   { path: '/agents/subagents/example-subagent', heading: /example-subagent/i },
  10 |   { path: '/runs', heading: /Execution history, status, and report entry points/i },
  11 |   { path: '/runs/example-run', heading: /example-run/i },
  12 |   { path: '/integrations', heading: /Claude Desktop, Cursor, and generic MCP onboarding/i },
  13 |   { path: '/settings', heading: /Usage, plan visibility, and feedback history/i },
  14 | ] as const;
  15 | 
  16 | test.describe('Phase 3 accessibility', () => {
  17 |   for (const route of ROUTES) {
  18 |     test(`route ${route.path} has no critical or serious axe violations`, async ({ page }) => {
  19 |       await page.goto(route.path);
  20 |       await page.waitForLoadState('networkidle');
  21 |       await expect(page.getByRole('main')).toBeVisible();
  22 |       await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
  23 |       await expectNoBlockingAxeViolations(page);
  24 |     });
  25 |   }
  26 | 
  27 |   test('desktop overlays remain accessible', async ({ page }) => {
  28 |     await page.goto('/');
  29 |     await page.waitForLoadState('networkidle');
  30 |     await page.getByRole('button', { name: /open command palette/i }).click();
> 31 |     await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  32 |     await expectNoBlockingAxeViolations(page);
  33 |     await page.keyboard.press('Escape');
  34 | 
  35 |     await page.getByRole('button', { name: /share beta feedback/i }).click();
  36 |     await expect(page.getByRole('dialog', { name: /beta feedback/i })).toBeVisible();
  37 |     await expect(page.getByLabel(/what happened\?/i)).toBeVisible();
  38 |     await expectNoBlockingAxeViolations(page);
  39 |   });
  40 | 
  41 |   test('mobile navigation drawer remains accessible', async ({ page }) => {
  42 |     await page.setViewportSize({ width: 390, height: 844 });
  43 |     await page.goto('/');
  44 |     await page.waitForLoadState('networkidle');
  45 |     await page.getByRole('button', { name: /menu/i }).click();
  46 |     await expect(page.getByRole('dialog', { name: /primary navigation/i })).toBeVisible();
  47 |     await expectNoBlockingAxeViolations(page);
  48 |   });
  49 | });
  50 | 
```