This is the **Roster** product UI (Next.js App Router): dashboard + **BFF** routes under `app/api/roster/*` that proxy to Roster HTTP. See repo **`OPERATIONS.md`** for env vars, phased auth, and deployment notes.

## Getting Started

Copy `.env.local.example` to `.env.local`, set Clerk keys and **`ROSTER_HTTP_URL`**, then:

```bash
pnpm dev
```

(`pnpm dev` runs **`next dev --webpack`** so CSS/Tailwind resolve reliably in the monorepo.)

Open [http://localhost:3000](http://localhost:3000).

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
