# Roster AI Work Library alpha

## Product boundary

Roster’s default experience is now a workspace-scoped library for reusable prompts and bounded
playbooks. The alpha is deliberately not a general chat product, a public marketplace, or an
autonomous agent runtime. Members can save, find, render, copy, review, comment on, favorite, and
export work without connecting an AI provider.

The original control-plane screens remain available to owners and admins under **Advanced**. Set
`NEXT_PUBLIC_WORK_LIBRARY_ENABLED=false` to restore the preserved control-plane home and navigation
while keeping the new data additive and intact.

## Implemented in this checkpoint

- Clerk organization bootstrap with workspace membership and role-gated navigation.
- Convex tenant enforcement on every new library query and mutation.
- Typed prompt/playbook assets, friendly input definitions, immutable versions, approvals,
  favorites, comments, starter provenance, and real adoption events.
- Lifecycle states: draft, shared, team approved, workspace approved, and archived.
- Home, Library, My Work, Approvals, Workspace Admin, Save, Use, and Advanced screens.
- Exact prompt rendering with no hidden rewriting or compression.
- Reviewed TXT, Markdown, DOCX, and PDF import with a 10 MB upload boundary.
- Markdown, JSON, and ZIP export on the same asset screen.
- Twelve unapproved starter prompts for marketing, business development, and client delivery.
- An idempotent admin action that loads starters as shared drafts for curator review.

## Deliberately not represented as live

- Provider credentials, exact-prompt model testing, model allowlists, token/cost receipts.
- Durable playbook execution, DOCX output, and the Proposal/SOW lighthouse run.
- Workspace-scoped OAuth remote MCP and client-specific live verification.
- Stripe workspace subscriptions, external beta signup, SSO, SCIM, or service accounts.

Those items remain gated by the phased delivery plan and must not be implied by UI copy or seeded
statistics before they are tested with real accounts.

## Alpha start

1. Sign in through Clerk and select or create an organization.
2. An owner opens **Workspace Admin** and chooses **Add starter library**.
3. Curators review starters in **Approvals**; no starter is pre-approved.
4. Champions save their real work, share one exact version, and reuse another person’s asset.
5. Copy and export actions write workspace-scoped reuse events for the alpha gate.

General business data only: do not upload credentials, payment-card data, protected health
information, or highly regulated records.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm test
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
pnpm --dir apps/web exec playwright test e2e/phase1-dashboard.spec.ts
pnpm --dir apps/web exec playwright test e2e/phase3-accessibility.spec.ts --grep "route / has"
```

The root `pnpm lint` command belongs to the legacy package and does not currently have a clean
baseline. The web application lint command above is the enforced lint gate for this checkpoint.
