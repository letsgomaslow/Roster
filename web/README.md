# Legacy static dashboard (deprecated)

This folder is the **old** vanilla JS dashboard. The canonical product UI is **`apps/web`** (Next.js App Router, Clerk, BFF to Roster HTTP).

- Prefer **`pnpm --filter web dev`** from the repo root (or `pnpm dev` inside `apps/web`).
- Do not extend this static site for new Roster features; add them in `apps/web`.
- S3 deploys that used **`scripts/deploy-web.sh`** target this tree only; plan hosting for `apps/web` separately (e.g. Vercel).

See **`OPERATIONS.md`** for runbooks, BFF env vars, and phased auth (no-login vs `ROSTER_BFF_REQUIRE_AUTH`).
