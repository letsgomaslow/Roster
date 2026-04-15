# Clerk Auth Setup & Troubleshooting

Runbook for local dev of the Roster control plane (`apps/web/`). Written after a live debug session on 2026-04-15 where Clerk rendered as "Auth disabled" even with valid keys on disk.

## TL;DR — start the web app correctly

```bash
# 1. Env file MUST live in apps/web/, not the repo root
cp apps/web/.env.local.example apps/web/.env.local
# fill in real values (see "Required values" below)

# 2. Start Roster HTTP server (default port 3003)
pnpm run dev:http

# 3. Start Next.js in a separate terminal
pnpm --filter web dev

# 4. Open http://localhost:3000 — sidebar should show "Sign in" + "Create account"
```

If the sidebar shows a card titled **"Auth disabled"**, your env file isn't being read. Jump to [Symptom matrix](#symptom-matrix).

## Required values in `apps/web/.env.local`

| Key                                 | Correct value                       | Common mistake                              |
| ----------------------------------- | ----------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` from Clerk dashboard  | — (secrets file absent)                     |
| `CLERK_SECRET_KEY`                  | `sk_test_...` from Clerk dashboard  | — (secrets file absent)                     |
| `CLERK_JWT_ISSUER_DOMAIN`           | `https://<slug>.clerk.accounts.dev` | —                                           |
| `NEXT_PUBLIC_CONVEX_URL`            | `https://<deployment>.convex.cloud` | Using `.convex.site` (HTTP actions domain)  |
| `ROSTER_HTTP_URL`                   | `http://127.0.0.1:3003`             | Using `http://localhost:3000` (Next's port) |

### Why `.convex.cloud`, not `.convex.site`

Convex exposes two domains per deployment:

- **`<slug>.convex.cloud`** — JS/WebSocket RPC. This is what `ConvexProviderWithAuth` in `app/components/AppProviders.tsx` opens. **Required for `NEXT_PUBLIC_CONVEX_URL`.**
- **`<slug>.convex.site`** — custom HTTP actions only. Using this for the client URL causes silent auth failures (the WebSocket never opens, but there is no console error).

### Why port 3003 for Roster

`src/config.ts:5` pins the Roster HTTP server to `PORT=3003` by default. Next.js dev runs on `3000`. Setting `ROSTER_HTTP_URL=http://localhost:3000` makes the BFF routes under `app/api/roster/*` proxy to themselves.

## Root cause analysis — the 2026-04-15 incident

### Symptom

With valid Clerk keys present at `/Users/.../Roster/.env.local`, the app still rendered the "Auth disabled" card from `ControlPlaneShell.tsx:73-85`. No console errors. Middleware was a no-op.

### Root cause

**Next.js only reads env vars from the app folder (`apps/web/.env.local`), not the monorepo root.** The `.env.local` existed at `/Users/.../Roster/.env.local` (where the Roster HTTP server reads it) but not at `/Users/.../Roster/apps/web/.env.local`. The Next server therefore saw `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as `undefined`.

The gating logic cascades through three layers:

1. **`app/layout.tsx:17-18`** — `clerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)` → `false`, so `<ClerkProvider>` is skipped.
2. **`proxy.ts:4-12`** — Clerk middleware is replaced with a pass-through `NextResponse.next()` when either key is missing.
3. **`app/components/AppProviders.tsx:47`** — `useAnonymousConvexAuth` is substituted, so Convex never receives a token.

### Contributing bugs found in the same file

- `NEXT_PUBLIC_CONVEX_URL` was set to `.convex.site` (wrong — see above).
- `ROSTER_HTTP_URL=http://localhost:3000` collided with Next's dev port.

### Fix applied

1. `cp .env.local apps/web/.env.local` (copy from root).
2. `sed` replacements for `.convex.site` → `.convex.cloud` and the `ROSTER_HTTP_URL` port.
3. Kill the stale `next dev` process holding the `apps/web` single-instance lock.
4. Restart `pnpm exec next dev --webpack`.

### Verification

- Fetched `/` and confirmed HTML contains `clerk.accounts.dev` + `Sign in` + `Create account` buttons; no "Auth disabled" card.
- Clicked Sign in → browser redirected to `https://<slug>.accounts.dev/sign-in?...` (Clerk hosted page) with correct app branding and redirect-back URLs.
- Console had only the expected "Clerk has been loaded with development keys" notice.

## Symptom matrix

| What you see                                                       | Likely cause                                          | Fix                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Sidebar shows **"Auth disabled"** card                             | `apps/web/.env.local` missing or keys missing/empty   | Copy root `.env.local` into `apps/web/`, ensure both Clerk keys are set, restart dev server |
| Sign-in works but Convex queries silently return no data           | `NEXT_PUBLIC_CONVEX_URL` is `.convex.site`            | Change to `.convex.cloud`, restart dev server                                               |
| BFF routes (`/api/roster/*`) hang or return 502/503                | `ROSTER_HTTP_URL` misconfigured or Roster not running | Start `pnpm run dev:http`; verify `ROSTER_HTTP_URL=http://127.0.0.1:3003`                   |
| `next dev` fails with "Another next dev server is already running" | Stale process holding per-directory lock              | `lsof -tiTCP:3000 -sTCP:LISTEN \| xargs kill`, then restart                                 |
| HTML has `Auth disabled` but env file exists in `apps/web/`        | Dev server not restarted after env change             | Kill and restart — Next reads env only at boot                                              |

## Two `.env.local` files — why

- **`/Users/.../Roster/.env.local`** — for the **Roster HTTP server** (`src/`). Loaded by the Node runtime when you run `pnpm run dev:http`.
- **`/Users/.../Roster/apps/web/.env.local`** — for the **Next.js web app**. Loaded by Next only from this folder.

They can share most keys (Clerk, Convex) but the Roster server and Next.js read their env from different paths. Keep both in sync; changing only one leads to subtle failures.

The `.env.local.example` template at `apps/web/.env.local.example` is the committed schema — copy it once per developer, fill in real values, never commit.

## Verifying Clerk is live (30-second check)

```bash
# Replace "Auth disabled" should NOT appear, but these SHOULD:
curl -s http://localhost:3000/ | grep -o -E 'Auth disabled|clerk\.accounts\.dev|ClerkProvider' | sort -u
# Expected: clerk.accounts.dev, ClerkProvider  (no Auth disabled)
```

Or in a browser: open `http://localhost:3000/`, scroll to the bottom of the left sidebar — you should see **Sign in** and **Create account** buttons (not a yellow "Auth disabled" card). Clicking **Sign in** should land on a page at `<your-tenant>.accounts.dev/sign-in` with "Sign in to Roster" heading.

## Related files

- `apps/web/app/layout.tsx` — gates `<ClerkProvider>` on `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `apps/web/proxy.ts` — Next.js 16 middleware; gates Clerk middleware on both keys.
- `apps/web/app/components/AppProviders.tsx` — Convex auth hook wiring; picks anonymous when Clerk is off.
- `apps/web/app/components/control-plane/ControlPlaneShell.tsx` — renders "Auth disabled" card when `clerkEnabled` is false.
- `OPERATIONS.md` — repo-wide phased-auth guide and production env matrix.
