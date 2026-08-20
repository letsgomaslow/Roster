# Flexible Save and Workspace Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let nontechnical users save arbitrary AI work with one required field and optionally organize it using workspace-specific teams and work types.

**Architecture:** Widen existing asset metadata, add a tenant-scoped taxonomy table, and keep draft creation transactional. Replace fixed frontend arrays with Convex-backed terms, then adapt downstream rendering and exports to optional metadata.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Clerk Organizations, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-20-flexible-save-taxonomy-design.md`

## Global Constraints

- Only the exact AI-work body is required for private capture.
- Never rewrite or truncate the saved body.
- Team, work type, purpose, and user-supplied title are optional.
- Contributors can create active workspace terms; curators can rename/archive them.
- Every query and mutation enforces workspace membership server-side.
- Existing asset data remains deployable through optional schema widening.
- No raw Convex transport or stack text reaches the UI.
- Preserve Option A’s stable, square, accessible Maslow interface.
- Do not commit, stage, push, or publish during this execution.

---

### Task 1: Flexible draft and workspace taxonomy domain

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/workLibrary.ts`
- Modify: `convex/workLibrary.test.ts`
- Create if useful: `convex/lib/workLibraryTaxonomy.ts`

**Interfaces:**
- Produces `listTaxonomyTerms({ kind? })`.
- Produces `createTaxonomyTerm({ kind, label })`.
- Produces `updateTaxonomyTerm({ termId, label?, status? })`.
- Changes `createDraft` metadata arguments to optional and accepts `teamLabel` / `jobLabel` for transactional custom-term creation.
- Produces `updatePrivateDraftMetadata({ assetId, title?, purpose?, teamKey?, jobKey? })`.

- [x] Add failing Convex tests proving body-only creation, long optional purpose, bounded search text, tenant-isolated terms, contributor creation, duplicate normalization, and curator-only maintenance.
- [x] Run `pnpm exec vitest run convex/workLibrary.test.ts` and confirm failures are caused by missing behavior.
- [x] Widen `purpose`, `teamKey`, and `jobKey` in the schema and add `taxonomyTerms` with indexed workspace/kind/key, normalized label, and active ordering access paths.
- [x] Implement deterministic fallback titles, independently bounded search text, optional metadata normalization, default-term upserts, and transactional custom-term resolution.
- [x] Implement role-enforced taxonomy list/create/update and private-only metadata updates.
- [x] Re-run the focused Convex suite until green, then run root TypeScript checking.

### Task 2: Adoption-first Save UI and error recovery

**Files:**
- Modify: `apps/web/app/components/screens/SaveAssetScreen.tsx`
- Modify: `apps/web/lib/work-library-ui.ts`
- Modify: `apps/web/lib/work-library-ui.test.ts`
- Modify: `apps/web/app/components/screens/work-library-screens.test.ts`
- Add a focused interactive test if needed beside `SaveAssetScreen.tsx`.

**Interfaces:**
- Consumes Task 1 taxonomy queries/mutations and optional `createDraft` arguments.
- Produces `friendlyDraftError(error): string` and custom-selection helpers whose outputs are asserted independently.

- [x] Add failing tests for one-field capture, optional organization controls, custom term payloads, long description acceptance, friendly errors, and the absence of raw Convex details.
- [x] Run the focused web tests and confirm RED for the intended behavior.
- [x] Replace the numbered technical form with “Save AI work,” one required body field, **Save to My Work**, and collapsed optional organization/reuse sections.
- [x] Load active taxonomy terms, allow “No selection” and “Add a new…” paths, and submit custom labels transactionally with the draft.
- [x] Separate import notices from save notices and sanitize all server errors.
- [x] Navigate to the saved detail with a success marker while preserving exact body input.
- [x] Re-run focused tests, web TypeScript, and scoped lint until green.

### Task 3: Optional metadata across Library, detail, export, and admin

**Files:**
- Modify: `apps/web/app/components/screens/LibraryScreen.tsx`
- Modify: `apps/web/app/components/screens/AssetDetailScreen.tsx`
- Modify: `apps/web/app/components/screens/WorkLibraryHomeScreen.tsx`
- Modify: `apps/web/app/components/screens/WorkspaceAdminScreen.tsx`
- Modify: `apps/web/app/components/screens/RouteStatusScreen.tsx`
- Modify: `apps/web/lib/work-library-ui.ts`
- Modify: `apps/web/lib/work-library-export.ts`
- Modify: `apps/web/lib/onboarding.ts`
- Modify: `apps/web/lib/work-library-navigation.ts`
- Modify: relevant focused tests in `apps/web`.

**Interfaces:**
- Consumes Task 1 taxonomy APIs and nullable asset metadata.
- Produces workspace taxonomy management for curators and private-draft organization editing.

- [x] Add failing tests for unclassified cards/details/exports, custom filter options, success notice, private metadata editing, and curator management boundaries.
- [x] Run the focused tests and confirm expected failures.
- [x] Replace fixed Library filter arrays with active workspace terms and omit missing badges cleanly.
- [x] Show saved-private confirmation and allow owners/curators to organize private drafts later without changing shared/approved metadata.
- [x] Add a calm Workspace Admin taxonomy section for add, rename, and archive actions with role-safe controls.
- [x] Update Markdown/JSON/ZIP exports for optional metadata without changing exact body content.
- [x] Re-run focused tests, web TypeScript, and scoped lint until green.

### Task 4: Browser journey and full verification

**Files:**
- Modify: `apps/web/e2e/phase3-accessibility.spec.ts` or add `apps/web/e2e/flexible-save.spec.ts`.
- Do not retain generated test output.

**Interfaces:**
- Exercises the complete integrated behavior from Tasks 1–3.

- [x] Add a browser regression for paste → body-only save → reopen → exact copy using a long structured prompt fixture.
- [x] Verify optional custom team/work type creation and later selection.
- [x] Verify keyboard reachability, visible focus, mobile layout, and zero critical/serious accessibility violations.
- [x] Run root and web tests, root and web TypeScript, web lint, `git diff --check`, and a fresh Next.js production build.
- [x] Start the local server on `localhost:3105`, run focused Playwright checks, and visually inspect desktop and 390px mobile states.
- [x] Run a final independent diff review and resolve all release-blocking findings before reporting completion.
