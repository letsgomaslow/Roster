# Contributing to Roster MCP

Thank you for contributing to **Roster MCP** by **Maslow AI** (npm: [`@maslowai/roster`](https://www.npmjs.com/package/@maslowai/roster)).

This project uses **pnpm** and **TypeScript**. See [docs/index.md](docs/index.md), [OPERATIONS.md](OPERATIONS.md) for Convex, and [docs/02-configuration.md](docs/02-configuration.md) for environment variables.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## How to contribute

- **Bugs:** Open an issue with reproduction steps, expected vs actual behavior, and environment (OS, Node 18+, pnpm version).
- **Features:** Open an issue describing the problem and proposed approach.
- **Docs:** Edits to `README.md`, `docs/`, and `OPERATIONS.md` are welcome.

## Development workflow

```bash
git clone <your-fork-or-upstream-url>
cd <repo-directory>
pnpm install
pnpm run build
pnpm run type-check
pnpm test
pnpm run lint
```

Run HTTP locally (example):

```bash
MODE=http STORAGE_TYPE=file pnpm run dev:http
```

Run MCP stdio (example):

```bash
MODE=mcp STORAGE_TYPE=file pnpm run dev:mcp
```

## Pull requests

1. Branch from `main`: `git checkout -b feat/short-description`
2. Keep changes focused; match existing style.
3. Ensure `pnpm test` and `pnpm run type-check` pass.
4. Open a PR with a clear description and test notes.

## Security

Report vulnerabilities privately per [SECURITY.md](./SECURITY.md).

Thank you for helping improve Roster MCP.
