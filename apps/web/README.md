This is the **Roster** product UI (Next.js App Router): dashboard + **BFF** routes under `app/api/roster/*` that proxy to Roster HTTP. See repo **`OPERATIONS.md`** for env vars, phased auth, and deployment notes.

## Getting Started

> **Env file location matters.** Next.js reads env from **`apps/web/.env.local`** — not the repo-root `.env.local`. The two files serve different processes (web app vs Roster server). Full rationale and troubleshooting in [`docs/AUTH-SETUP.md`](./docs/AUTH-SETUP.md).

```bash
# 1. Create the env file in the correct location
cp apps/web/.env.local.example apps/web/.env.local
# Fill in: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
#          CLERK_JWT_ISSUER_DOMAIN, NEXT_PUBLIC_CONVEX_URL (must be .convex.cloud),
#          ROSTER_HTTP_URL=http://127.0.0.1:3003

# 2. Start the Roster HTTP server (separate terminal, repo root)
pnpm run dev:http

# 3. Start the web app
pnpm dev
```

(`pnpm dev` runs **`next dev --webpack`** so CSS/Tailwind resolve reliably in the monorepo.)

Open [http://localhost:3000](http://localhost:3000). The sidebar should show **Sign in** and **Create account** buttons. If you see an **"Auth disabled"** card, Clerk env is wrong — see [`docs/AUTH-SETUP.md`](./docs/AUTH-SETUP.md#symptom-matrix).

### Common pitfalls

- **`NEXT_PUBLIC_CONVEX_URL` host:** must be `<slug>.convex.cloud`, not `<slug>.convex.site`. The `.site` domain is for HTTP actions only — using it silently breaks the Convex client.
- **Port collision:** `ROSTER_HTTP_URL` points to the _Roster_ server (default `3003`), not Next's own port (`3000`). Setting it to `:3000` makes the BFF proxy to itself.
- **Stale dev servers:** Next refuses to start a second dev server in the same directory. If `pnpm dev` exits with _"Another next dev server is already running"_, kill the stale PID: `lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill`.
- **Env changes require a restart:** Next reads env only at boot.

### Tests

- **Unit / forward helpers:** `pnpm test`
- **Playwright Phase 1:** `pnpm run test:e2e`
- **Playwright Phase 2 (BFF auth):** `pnpm run test:e2e:auth` (see `e2e/phase2-bff-auth.spec.ts` and `OPERATIONS.md`)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
