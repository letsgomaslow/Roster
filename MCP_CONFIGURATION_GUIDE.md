# Roster MCP — client configuration guide

**Product:** Roster MCP · **Maslow AI** · **npm** `@maslowai/roster`

This guide shows how to register Roster MCP in MCP clients (Claude Desktop, Cursor, etc.). For **Convex** (hosted storage), see **[OPERATIONS.md](OPERATIONS.md)** and [docs/02-configuration.md](docs/02-configuration.md).

---

## Recommended: `npx` + `MODE=mcp`

```json
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "file",
        "PROMPTS_DIR": "/absolute/path/to/your/data/prompts",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Memory storage (testing)

```json
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "memory",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Convex (online prompts)

Set `STORAGE_TYPE=convex`, `CONVEX_URL`, and Clerk or dev-owner variables as documented in **[OPERATIONS.md](OPERATIONS.md)**.

## AWS-backed storage

The server can use DynamoDB/S3/SQS when `STORAGE_TYPE` is outside `file` / `memory` / `postgres` / `convex` (see `src/index.ts`). Supply `AWS_REGION`, `PROMPTS_TABLE`, `PROMPTS_BUCKET`, `PROCESSING_QUEUE`, and credentials/IAM as appropriate.

## Legacy npm bin names

The package may still expose `mcp-prompts` as a bin alias; prefer **`roster`** for new documentation.

---

More detail: [docs/06-mcp-integration.md](docs/06-mcp-integration.md), [README.md](README.md).
