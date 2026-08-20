# Roster MCP · Maslow AI — operations (Convex + HTTP)

This document is the **canonical runbook** for running **Roster MCP** with **Convex** as the online prompt store, including Clerk authentication, dev-owner mode, and bulk import from `data/prompts`.

## Single entrypoint (daily driver)

Run the unified HTTP server:

```bash
MODE=http STORAGE_TYPE=convex node dist/index.js
```

Do **not** rely on `src/http-server.ts` for new deployments; it remains AWS-only and is deprecated.

## Required environment (Clerk)

| Variable                    | Purpose                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `CONVEX_URL`                | Deployment URL, e.g. `https://small-mouse-123.convex.cloud`                                                                 |
| `CLERK_PUBLISHABLE_KEY`     | Clerk publishable key (Express)                                                                                             |
| `CLERK_SECRET_KEY`          | Clerk secret key                                                                                                            |
| `CLERK_CONVEX_JWT_TEMPLATE` | Optional; default `convex`. Name of the Clerk JWT template Convex expects.                                                  |
| `CLERK_JWT_ISSUER_DOMAIN`   | Set in **Convex** dashboard for `convex/auth.config.ts` (Clerk issuer URL, e.g. `https://YOUR_INSTANCE.clerk.accounts.dev`) |
| `IMPORT_SECRET`             | Set in **Convex** dashboard for bulk import mutation `prompts:importBulk`                                                   |

## Next.js product UI (`apps/web`) — BFF to Roster HTTP

The canonical dashboard lives in **`apps/web`** (App Router). The browser talks to **same-origin** route handlers under **`/api/roster/*`**, which proxy to Roster using **`ROSTER_HTTP_URL`** (server-only; do not rely on `NEXT_PUBLIC_*` for the BFF base URL).

1. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from Clerk (required for middleware on matched routes).
3. Set **`ROSTER_HTTP_URL`** to your Roster HTTP base (e.g. `http://127.0.0.1:3003` locally).
4. Optional: `NEXT_PUBLIC_CONVEX_URL` if client components call Convex directly. **Use the `.convex.cloud` host**, not `.convex.site` — the `.site` domain is for HTTP actions only and silently breaks the Convex client (no WebSocket, no console error).
5. From repo root: `pnpm --filter web dev` (or `cd apps/web && pnpm dev`). Dev uses **`next dev --webpack`** so Tailwind resolves correctly in this monorepo.

> **Common misconfigurations (seen 2026-04-15):**
>
> - Env vars placed in the **repo-root `.env.local`** are NOT read by Next.js. The file at `apps/web/.env.local` is separate. If the sidebar shows an "Auth disabled" card despite valid keys, this is almost always the cause. Full RCA: [`apps/web/docs/AUTH-SETUP.md`](apps/web/docs/AUTH-SETUP.md).
> - `ROSTER_HTTP_URL=http://localhost:3000` collides with the Next dev server's own port. Set it to `http://127.0.0.1:3003` (Roster's default per `src/config.ts:5`).
> - Env changes require a full dev-server restart. Next reads env only at boot.

### Phased auth (local vs production-shaped)

| Phase                     | Roster (Express)                                                                                   | Next BFF (`apps/web`)                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — no login**          | Omit `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` on Roster so HTTP API is open for local testing. | Omit **`ROSTER_BFF_REQUIRE_AUTH`** (or set `false`). Handlers do not call `auth()`.                                                                                            |
| **2 — production-shaped** | Set Clerk keys on Roster; align JWT / Convex template envs if `STORAGE_TYPE=convex`.               | Set **`ROSTER_BFF_REQUIRE_AUTH=true`**. Handlers require Clerk session and forward `Authorization: Bearer …` when a token is available (`CLERK_ROSTER_JWT_TEMPLATE` optional). |

### Production / Vercel-style env matrix

| Variable                            | Where                 | Purpose                                                                                   |
| ----------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `ROSTER_HTTP_URL`                   | Next server (private) | BFF → Roster; must be reachable from the Next runtime (public HTTPS URL, tunnel, or VPC). |
| `ROSTER_BFF_REQUIRE_AUTH`           | Next server           | `true` / `1` / `yes` to gate `/api/roster/*` with Clerk.                                  |
| `CLERK_ROSTER_JWT_TEMPLATE`         | Next server           | Optional Clerk JWT template name for Roster/Convex parity.                                |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Next                  | Clerk browser / middleware.                                                               |
| `CLERK_SECRET_KEY`                  | Next                  | Clerk server.                                                                             |

Roster must accept the forwarded session or your chosen auth scheme when Clerk is enabled on Express.

### E2E (Playwright) in `apps/web`

- **Phase 1 (no BFF auth):** `pnpm run test:e2e` — uses `next dev --webpack`; set Clerk keys and optional `ROSTER_HTTP_URL` like local dev.
- **Phase 2 (401):** `ROSTER_BFF_REQUIRE_AUTH=true ROSTER_HTTP_URL=http://127.0.0.1:9 CI=1 pnpm run test:e2e:auth` — expects **401** JSON without a session (dummy upstream URL is fine).
- **Phase 2 (200 signed-in):** create a Playwright storage file after signing in (e.g. `npx playwright codegen http://127.0.0.1:3100 --save-storage=e2e/storage/clerk.json`), then run with `E2E_STORAGE_STATE` pointing at that file (see `e2e/phase2-bff-auth.spec.ts`).

## Legacy static `web/` dashboard (deprecated)

The **`web/`** tree is the **old** static dashboard. **Do not** use it for new features. Prefer **`apps/web`**. **`scripts/deploy-web.sh`** uploads **`web/`** to S3 only; for the Next UI, deploy `apps/web` (e.g. Vercel). See **`web/README.md`**.

## Convex without Clerk (dev / single-tenant)

Use this when you want `STORAGE_TYPE=convex` but are not using Clerk yet.

**Security:** Set `CONVEX_DEV_OWNER_USER_ID` only for local Convex or a non–internet-exposed deployment. Anyone who can call your Convex deployment without a JWT is treated as that user for all prompt data.

1. In the **Convex dashboard** → Settings → Environment variables, set `CONVEX_DEV_OWNER_USER_ID` to a stable string (e.g. `dev_owner_1`). This must match the Node/MCP process env below.
2. On the **Node** side, set the same variable plus `CONVEX_URL`. Omit `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. For bulk import, set `OWNER_USER_ID` in the import script to the **same** value as `CONVEX_DEV_OWNER_USER_ID`.

```bash
export CONVEX_URL=https://....convex.cloud
export CONVEX_DEV_OWNER_USER_ID=dev_owner_1
export STORAGE_TYPE=convex
MODE=http node dist/index.js
```

`MODE=mcp` with `STORAGE_TYPE=convex` also uses `CONVEX_DEV_OWNER_USER_ID` for stdio MCP tool calls.

## Convex setup (with Clerk)

1. `pnpm exec convex dev` (or deploy) from the repo root with `convex/` present.
2. In the Convex dashboard, set `CLERK_JWT_ISSUER_DOMAIN` to match Clerk’s JWT issuer.
3. Create a Clerk **JWT template** named `convex` (or set `CLERK_CONVEX_JWT_TEMPLATE`) per [Convex + Clerk](https://docs.convex.dev/auth/clerk).

## Migrate from local Convex to cloud (CLI)

Target example: **`https://marvelous-starling-320.convex.cloud`**. A committed template is **`convex-cloud.env.template`** — copy it to **`.env.local`** and adjust `CONVEX_DEPLOYMENT` if the dashboard shows a different deployment type or slug (`prod:…` vs `dev:…`).

1. **Log in** (once per machine): `pnpm run convex:login`
2. **Link this repo** to the Convex project that owns that URL (if `.env.local` is missing or deploy says you lack access):
   - `pnpm run convex:configure`
   - Choose the existing team/project that contains deployment `marvelous-starling-320`.
3. **Confirm `.env.local`**: `CONVEX_DEPLOYMENT` must match the dashboard (Convex writes this when you run `convex dev`; the template is a shortcut if you already know the slug).
4. **Push backend code to production**: `pnpm run convex:deploy`  
   Convex resolves the **project** from `CONVEX_DEPLOYMENT` and pushes functions + schema to this project’s **production** deployment (see [CLI deploy](https://docs.convex.dev/cli#deploy-convex-functions-to-production)).
5. **Dashboard env** (production): set `IMPORT_SECRET` (and optional `CONVEX_DEV_OWNER_USER_ID` or Clerk `CLERK_JWT_ISSUER_DOMAIN`) under Deployment → Settings → Environment variables. Use `--prod` with `pnpm exec convex env set …` if you prefer the CLI.
6. **Move table data** (optional):
   - **Snapshot:** while still linked to the _old_ deployment, `pnpm run convex:export` (or `pnpm exec convex export --path ./convex-snapshot.zip`). Then point `.env.local` at the cloud project, run `pnpm run convex:import:prod` (imports into **prod**; confirms with `-y`).
   - **JSON prompts only:** use the **Importing `data/prompts` into Convex** section below with `CONVEX_URL=https://marvelous-starling-320.convex.cloud`.
7. **Run Roster** with `STORAGE_TYPE=convex` and the same `CONVEX_URL` as in `.env.local`.

## HTTP endpoints

- **REST + legacy tool bridge:** `/v1/*`, `GET/POST /mcp`, `GET/POST /mcp/tools` (require Clerk session when `CLERK_PUBLISHABLE_KEY` is set).
- **Spec Streamable HTTP (stateless):** `POST /mcp/streamable` — use with MCP clients that support Streamable HTTP.
- **Health:** `GET /health` (no auth).

## Local HTTPS (development only; MCP clients that require `https://`)

In-process TLS is **only** for local development. **Do not** rely on it in production: set `NODE_ENV=production`, omit `DEV_LOCAL_HTTPS` and `HTTPS_*`, and terminate TLS at your load balancer, ingress, or reverse proxy (the app listens on **HTTP**).

When `NODE_ENV=production`, any `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`, or `DEV_LOCAL_HTTPS` values are **ignored** and a warning is logged; the server always uses plain HTTP.

For non-production, in-process HTTPS requires **all** of:

| Variable               | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `DEV_LOCAL_HTTPS`      | Set to `1`, `true`, or `yes` (required with the PEM paths below) |
| `HTTPS_KEY_PATH`       | PEM private key file                                             |
| `HTTPS_CERT_PATH`      | PEM certificate (leaf + chain if needed)                         |
| `HTTPS_CA_PATH`        | Optional extra CA bundle                                         |
| `HTTPS_KEY_PASSPHRASE` | Optional passphrase for encrypted key                            |

If only one of `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` is set, startup fails. If both are set without `DEV_LOCAL_HTTPS`, startup fails (explicit opt-in for dev TLS).

**Example with [mkcert](https://github.com/FiloSottile/mkcert)** (trusted locally after `mkcert -install`):

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
# Creates ./localhost+2.pem and ./localhost+2-key.pem (names may vary)

NODE_ENV=development MODE=http STORAGE_TYPE=file PROMPTS_DIR=./data/prompts \
  DEV_LOCAL_HTTPS=1 \
  HTTPS_KEY_PATH=./localhost+2-key.pem \
  HTTPS_CERT_PATH=./localhost+2.pem \
  PORT=3443 \
  node dist/index.js
```

Then open `https://localhost:3443/health` (your browser will trust the cert after mkcert’s CA is installed).

**Without local certs:** use a tunnel that terminates HTTPS and forwards to your app, e.g. [ngrok](https://ngrok.com/) (`ngrok http 3000`) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/). Point the MCP client at the tunnel’s `https://…` URL.

## Importing `data/prompts` into Convex

```bash
CONVEX_URL=... \
IMPORT_SECRET=... \
OWNER_USER_ID=user_... \
pnpm exec ts-node scripts/import-prompts-to-convex.ts
```

- With Clerk: `OWNER_USER_ID` is your Clerk user id (`sub`).
- Without Clerk: `OWNER_USER_ID` must equal `CONVEX_DEV_OWNER_USER_ID` (Convex dashboard + Node).

Set `IMPORT_SECRET` in Convex to match.

## Local development without Convex

Use `STORAGE_TYPE=file` or `memory` and omit `CLERK_PUBLISHABLE_KEY`; the server skips `requireAuth` and uses the legacy `extractUserContext` stub.

## Startup requirements for `STORAGE_TYPE=convex`

- `CONVEX_URL` is required.
- **Either** `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, **or** `CONVEX_DEV_OWNER_USER_ID` (same value in Convex dashboard env for functions).
