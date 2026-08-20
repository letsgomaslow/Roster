# Roster MCP documentation

**Roster MCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server by **Maslow AI** for managing, versioning, and serving prompts and templates. Install the published package as **`@maslowai/roster`**.

This site indexes the docs in this repository. For **Convex** (hosted database), environment variables, and imports, see **[OPERATIONS.md](../OPERATIONS.md)** at the repo root.

## Documentation index

### Getting started

- [Quick start](01-quickstart.md) — Run locally with `npx`, Docker, or Convex
- [Configuration](02-configuration.md) — Environment variables (aligned with `src/config.ts`)
- [Overview](00-overview.md) — Architecture overview

### Core features

- [Storage adapters](03-storage-adapters.md) — `file`, `memory`, `postgres`, `convex`, AWS path
- [API reference](04-api-reference.md) — HTTP API (when `MODE=http`)
- [Templates](05-templates-guide.md) — Variables and templating
- [MCP integration](06-mcp-integration.md) — Client configuration for Roster MCP

### Development and deployment

- [Developer guide](07-developer-guide.md)
- [Roadmap](08-roadmap.md)
- [Workflow guide](09-workflow-guide.md)

## Quick start

### npm / npx

```bash
npx -y @maslowai/roster
```

### Docker

```bash
docker run -d --name roster-mcp -p 3003:3003 \
  -v $(pwd)/data:/app/data \
  ghcr.io/roster/roster:latest
```

### Convex (hosted)

Set `STORAGE_TYPE=convex`, `CONVEX_URL`, and auth per **[OPERATIONS.md](../OPERATIONS.md)**.

### Build from source

```bash
git clone <your-repo-url>
cd <repo-directory>
pnpm install
pnpm run build
pnpm test
```

## Architecture

Roster MCP uses **hexagonal architecture**: core domain logic in `src/core/`, ports (interfaces), and adapters under `src/adapters/` (file, memory, Convex, AWS).

## Development commands

| Command               | Description      |
| --------------------- | ---------------- |
| `pnpm run build`      | Compile with SWC |
| `pnpm run type-check` | TypeScript check |
| `pnpm test`           | Unit tests       |
| `pnpm run dev:http`   | HTTP dev mode    |
| `pnpm run dev:mcp`    | MCP stdio dev    |

## Contributing and license

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- MIT License — see [LICENSE](../LICENSE). Copyright Maslow AI and contributors.

## Support

- **npm**: [@maslowai/roster](https://www.npmjs.com/package/@maslowai/roster)
- **Convex operations**: [OPERATIONS.md](../OPERATIONS.md)
- Use your team’s issue tracker when the GitHub repository is published.
