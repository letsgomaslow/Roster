# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3-accessibility.spec.ts >> Phase 3 accessibility >> mobile navigation drawer remains accessible
- Location: e2e/phase3-accessibility.spec.ts:41:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: /primary navigation/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: /primary navigation/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - complementary "Primary navigation" [ref=e5]:
      - generic [ref=e6]:
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
        - button "Close" [ref=e20]
      - navigation "Primary" [ref=e21]:
        - link "Home Overview" [ref=e22] [cursor=pointer]:
          - /url: /
          - paragraph [ref=e23]: Home
          - paragraph [ref=e24]: Overview
        - link "Library Prompts" [ref=e25] [cursor=pointer]:
          - /url: /library
          - paragraph [ref=e26]: Library
          - paragraph [ref=e27]: Prompts
        - link "Agents Catalog" [ref=e28] [cursor=pointer]:
          - /url: /agents
          - paragraph [ref=e29]: Agents
          - paragraph [ref=e30]: Catalog
        - link "Runs Execution" [ref=e31] [cursor=pointer]:
          - /url: /runs
          - paragraph [ref=e32]: Runs
          - paragraph [ref=e33]: Execution
        - link "Integrations MCP setup" [ref=e34] [cursor=pointer]:
          - /url: /integrations
          - paragraph [ref=e35]: Integrations
          - paragraph [ref=e36]: MCP setup
        - link "Settings Usage" [ref=e37] [cursor=pointer]:
          - /url: /settings
          - paragraph [ref=e38]: Settings
          - paragraph [ref=e39]: Usage
      - generic [ref=e40]:
        - paragraph [ref=e41]: Beta posture
        - paragraph [ref=e42]: Fast path for Claude Desktop, Cursor, and any MCP-compatible host.
        - paragraph [ref=e43]: The web app mirrors the MCP server surface, so the shortest route from setup to feedback stays inside one control plane.
        - button "Send beta feedback" [ref=e44]
      - generic [ref=e46]:
        - paragraph [ref=e47]: Auth disabled
        - paragraph [ref=e48]: "Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `apps/web/.env.local` to enable Clerk without keyless development mode."
    - main [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - button "Menu" [active] [ref=e52]
          - link "Go to the Roster home screen" [ref=e53] [cursor=pointer]:
            - /url: /
            - generic [ref=e54]:
              - img [ref=e55]
              - generic [ref=e58]:
                - generic [ref=e59]:
                  - generic [ref=e60]: Maslow
                  - generic [ref=e61]: "|"
                  - generic [ref=e62]: AI
                - generic [ref=e64]: Roster
          - generic [ref=e65]:
            - paragraph [ref=e66]: Control plane
            - paragraph [ref=e67]: Operational overview
        - generic [ref=e68]:
          - button "Open command palette" [ref=e69]:
            - text: Search
            - generic [ref=e70]: ⌘K
          - button "Feedback" [ref=e71]
      - generic [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e75]:
            - paragraph [ref=e76]: Operational Overview
            - generic [ref=e77]:
              - heading "Private beta control plane for the Roster MCP server" [level=1] [ref=e78]
              - paragraph [ref=e79]: Roster should read like a working control plane, not a landing page. This view keeps connection status and workspace momentum side by side so beta users can tell whether the MCP server is ready and whether their library is actually moving.
          - generic [ref=e80]:
            - link "Finish MCP setup" [ref=e81] [cursor=pointer]:
              - /url: /integrations
            - link "New prompt" [ref=e82] [cursor=pointer]:
              - /url: /library/new
        - generic [ref=e83]:
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - heading "Integration readiness" [level=2] [ref=e87]
                - paragraph [ref=e88]: The shortest path to useful feedback starts with proving setup, tool availability, and usage limits from one screen.
              - generic [ref=e89]: Needs attention
            - generic [ref=e90]:
              - generic [ref=e91]:
                - generic [ref=e92]:
                  - paragraph [ref=e93]: Server health
                  - paragraph [ref=e94]: Check
                  - paragraph [ref=e95]: Health check is not healthy yet.
                - generic [ref=e96]:
                  - paragraph [ref=e97]: Available tools
                  - paragraph [ref=e98]: "0"
                  - paragraph [ref=e99]: Listed from the MCP tool endpoint.
                - generic [ref=e100]:
                  - paragraph [ref=e101]: Rate window
                  - paragraph [ref=e102]: Unknown
                  - paragraph [ref=e103]: Plan unavailable
              - generic [ref=e104]:
                - generic [ref=e105]:
                  - paragraph [ref=e106]: Quick-start clients
                  - generic [ref=e107]:
                    - link "Claude Desktop Generate a desktop config and test one tool call." [ref=e108] [cursor=pointer]:
                      - /url: /integrations#claude
                      - paragraph [ref=e109]: Claude Desktop
                      - paragraph [ref=e110]: Generate a desktop config and test one tool call.
                    - link "Cursor Use the same server definition with the beta-friendly copy path." [ref=e111] [cursor=pointer]:
                      - /url: /integrations#cursor
                      - paragraph [ref=e112]: Cursor
                      - paragraph [ref=e113]: Use the same server definition with the beta-friendly copy path.
                    - link "Generic host Keep a JSON reference ready for any MCP-compatible runtime." [ref=e114] [cursor=pointer]:
                      - /url: /integrations#generic
                      - paragraph [ref=e115]: Generic host
                      - paragraph [ref=e116]: Keep a JSON reference ready for any MCP-compatible runtime.
                - generic [ref=e117]:
                  - paragraph [ref=e118]: MCP readiness checklist
                  - generic [ref=e119]:
                    - generic [ref=e120]:
                      - generic [ref=e121]: "Server responds to `/health`"
                      - generic [ref=e122]: Missing
                    - generic [ref=e123]:
                      - generic [ref=e124]: MCP tools are discoverable
                      - generic [ref=e125]: Missing
                    - generic [ref=e126]:
                      - generic [ref=e127]: Prompt catalog is loaded
                      - generic [ref=e128]: Missing
                    - generic [ref=e129]:
                      - generic [ref=e130]: Usage state is visible
                      - generic [ref=e131]: Missing
          - generic [ref=e132]:
            - generic [ref=e134]:
              - heading "Workspace activity" [level=2] [ref=e135]
              - paragraph [ref=e136]: Use these cards to spot whether the beta user is actually creating, editing, and running anything.
            - generic [ref=e138]:
              - generic [ref=e139]:
                - paragraph [ref=e140]: Library items
                - paragraph [ref=e141]: "0"
                - paragraph [ref=e142]: Direct Convex read
              - generic [ref=e143]:
                - paragraph [ref=e144]: Feedback signals
                - paragraph [ref=e145]: "0"
                - paragraph [ref=e146]: Recent feedback count
              - generic [ref=e147]:
                - paragraph [ref=e148]: Agents registered
                - paragraph [ref=e149]: "0"
                - paragraph [ref=e150]: Non-standard prompts
              - generic [ref=e151]:
                - paragraph [ref=e152]: Runs tracked
                - paragraph [ref=e153]: "0"
                - paragraph [ref=e154]: From the orchestration endpoint
        - generic [ref=e155]:
          - generic [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e158]:
                - heading "Recent prompts" [level=2] [ref=e159]
                - paragraph [ref=e160]: Convex-backed recent activity keeps the control plane responsive while BFF routes stay reserved for side effects.
              - link "Open library" [ref=e161] [cursor=pointer]:
                - /url: /library
            - generic [ref=e163]:
              - paragraph [ref=e164]: Prompt activity has not started
              - paragraph [ref=e165]: No prompt activity is visible yet. The beta user should be able to create, edit, and apply a template without leaving the web app.
              - link "Create the first prompt" [ref=e167] [cursor=pointer]:
                - /url: /library/new
          - generic [ref=e168]:
            - generic [ref=e169]:
              - generic [ref=e170]:
                - heading "Recent runs" [level=2] [ref=e171]
                - paragraph [ref=e172]: The orchestration list should immediately tell you whether the backend is producing traceable work.
              - link "Open runs" [ref=e173] [cursor=pointer]:
                - /url: /runs
            - generic [ref=e175]:
              - paragraph [ref=e176]: No run history yet
              - paragraph [ref=e177]: No orchestration runs are visible yet. The beta needs a working path from starting a run to opening its report.
              - link "Start orchestration" [ref=e179] [cursor=pointer]:
                - /url: /runs
          - generic [ref=e180]:
            - generic [ref=e182]:
              - heading "Usage and catalog signals" [level=2] [ref=e183]
              - paragraph [ref=e184]: These cards make the premium surface feel informed instead of ornamental.
            - generic [ref=e186]:
              - generic [ref=e187]:
                - paragraph [ref=e188]: Plan
                - paragraph [ref=e189]: Unavailable
                - paragraph [ref=e190]: Rate limit details are not currently available.
              - paragraph [ref=e192]: Library mix
              - generic [ref=e193]:
                - paragraph [ref=e194]: Agent health
                - paragraph [ref=e195]: Subagent statistics are not available yet.
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
  31 |     await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
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
> 46 |     await expect(page.getByRole('dialog', { name: /primary navigation/i })).toBeVisible();
     |                                                                             ^ Error: expect(locator).toBeVisible() failed
  47 |     await expectNoBlockingAxeViolations(page);
  48 |   });
  49 | });
  50 | 
```