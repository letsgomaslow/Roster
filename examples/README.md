# Examples — Roster MCP (Maslow AI)

Example MCP client configs and workflow snippets for **[Roster MCP](https://www.npmjs.com/package/@maslowai/roster)** (`@maslowai/roster`).

For **Convex** (hosted prompts), see **[OPERATIONS.md](../OPERATIONS.md)** and [docs/02-configuration.md](../docs/02-configuration.md).

## MCP client configuration files

| File                                 | Description              | Use case                                                    |
| ------------------------------------ | ------------------------ | ----------------------------------------------------------- |
| `roster-config-file-latest.json`     | File storage             | Local development                                           |
| `roster-config-memory-latest.json`   | In-memory storage        | Tests, ephemeral sessions                                   |
| `roster-config-postgres-latest.json` | PostgreSQL env example   | Reference only — HTTP entrypoint does not wire Postgres yet |
| `roster-config-mdc-latest.json`      | MDC-oriented env example | Experimental / future MDC adapter                           |

## Workflow examples

| File                                 | Description                |
| ------------------------------------ | -------------------------- |
| `advanced-workflow-example.json`     | Multi-step prompt chaining |
| `claude-desktop-config-example.json` | Claude Desktop MCP snippet |

## Quick start (file storage)

Use server key `roster` in `mcp.json`:

```json
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "file",
        "PROMPTS_DIR": "./prompts",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Storage types (see [docs/03-storage-adapters.md](../docs/03-storage-adapters.md))

- **`file`** — JSON prompts on disk (default in schema).
- **`memory`** — volatile in-memory store.
- **`convex`** — hosted backend; requires `CONVEX_URL` and Clerk or `CONVEX_DEV_OWNER_USER_ID`.
- **Anything else** (e.g. `aws`) — legacy AWS DynamoDB/S3/SQS path when those env vars are set.

## More documentation

- [Roster MCP docs index](../docs/index.md)
- [Configuration reference](../docs/02-configuration.md)
- [MCP integration](../docs/06-mcp-integration.md)

Contributions welcome: new client examples, workflows, and integration notes.
