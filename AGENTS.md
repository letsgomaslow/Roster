<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Roster Release Safety

- Apply workspace-role checks at both the screen mount boundary and every server write boundary; hiding navigation is not authorization.
- Treat the current verified identity-provider role as authoritative on every request so a demotion cannot retain stored privileges.
- Apply search and taxonomy constraints through Convex indexes before limiting results; never filter a pre-truncated library page.
- Validate required prompt inputs explicitly before copy, and require version-specific evidence before recording approval.
- In Clerk-backed browser tests, wait for the expected visible screen state rather than `networkidle`; Clerk development clients keep background connections open.
- Own Clerk-to-Convex handoff timeout and recovery in the shared workspace boundary so every signed-in route reaches the same terminal state.
- Keep the last approved asset version separate from a pending replacement; normal use stays on the trusted version until the replacement is approved.
- Keep the legacy Advanced runtime disabled by default in multi-tenant builds; when explicitly enabled, gate both reads and writes with verified owner/admin access.
- Gate an entire legacy route prefix at one shared mount boundary so alternate server entry points cannot bypass the policy.
- Add fields to existing Convex tables as optional first; dual-write, backfill, verify, and only then make them required.
- Treat version visibility as explicit governance: sharing one version must never disclose discarded private bodies, comments, or evidence.
- For nontechnical capture flows, require only the exact reusable AI text; title, description, taxonomy, and fill-in fields must remain optional and editable later.
- Bound indexed search projections independently from the canonical body, and never truncate or rewrite the saved AI text.
- Use workspace taxonomy queries as the only runtime label source; static defaults may seed data but must not drive filters or presentation.
- Project an explicit public export contract and render fixed recovery copy so internal records, raw Convex diagnostics, and request IDs never reach users.
- Hold a stable loading surface until every data source needed for the first complete render is resolved; do not let labels or actions pop in later.
