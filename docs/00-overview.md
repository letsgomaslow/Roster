# Overview — Roster MCP

**Roster MCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server published by **Maslow AI** as **`@maslowai/roster`**. It manages prompts and templates for LLM workflows with swappable storage.

## Architecture

- **Core** (`src/core/`): Domain entities, services, and port interfaces (no infrastructure imports).
- **Adapters** (`src/adapters/`): File, memory, Convex, and AWS-backed implementations.
- **Transports**: MCP stdio (`MODE=mcp`) and HTTP (`MODE=http`) via `src/index.ts`.

## Storage at a glance

| `STORAGE_TYPE` | Role                                                          |
| -------------- | ------------------------------------------------------------- |
| `file`         | JSON prompts on disk                                          |
| `memory`       | Ephemeral in-process store                                    |
| `convex`       | Hosted Convex backend — see [OPERATIONS.md](../OPERATIONS.md) |
| `postgres`     | Reserved; not wired in current entrypoint                     |
| Other values   | AWS DynamoDB/S3/SQS path in `src/index.ts`                    |

## Documentation map

- [Quick start](01-quickstart.md)
- [Configuration](02-configuration.md)
- [Storage adapters](03-storage-adapters.md)
- [MCP integration](06-mcp-integration.md)
