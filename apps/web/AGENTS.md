<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Environment & auth (read before starting the dev server)

**The `.env.local` file MUST live at `apps/web/.env.local`.** Next.js does NOT read the repo-root `.env.local` — that one is consumed by the Roster HTTP server (`src/`). There are two env files by design; they are not interchangeable.

Full setup + RCA is in [`docs/AUTH-SETUP.md`](./docs/AUTH-SETUP.md). The short version:

1. `cp apps/web/.env.local.example apps/web/.env.local`, fill real values.
2. `NEXT_PUBLIC_CONVEX_URL` must use the `.convex.cloud` host (not `.convex.site` — that's the HTTP-actions domain and silently breaks the Convex client).
3. `ROSTER_HTTP_URL` must point to the Roster HTTP server (default `http://127.0.0.1:3003`), NOT to Next's own port `3000`.
4. Restart `pnpm --filter web dev` after any env change — Next reads env only at boot.

If the sidebar shows a card titled **"Auth disabled"**, one of the above is wrong. See the symptom matrix in `docs/AUTH-SETUP.md`.

## Running the codebase cleanly

```bash
# From repo root, in two terminals:
pnpm run dev:http        # Roster HTTP server on :3003
pnpm --filter web dev    # Next.js control plane on :3000
```

Then open `http://localhost:3000`. Sidebar should render **Sign in** / **Create account** buttons. Clicking Sign in should redirect to your Clerk tenant at `<slug>.accounts.dev/sign-in`.

**Before starting a dev server**, check nothing is already bound:

```bash
lsof -iTCP:3000 -sTCP:LISTEN -P   # should be empty if you want port 3000
lsof -iTCP:3003 -sTCP:LISTEN -P   # should be empty for Roster
```

A previous `next dev` holding the `apps/web` single-instance lock is the most common reason a fresh `pnpm dev` exits with _"Another next dev server is already running"_. Kill it with `kill <PID>` from the `lsof` output, then restart.
