# MCP integration — Roster MCP

**Roster MCP** exposes tools over the [Model Context Protocol](https://modelcontextprotocol.io/) when run with **`MODE=mcp`** (stdio). The server identifies as **`roster`** in MCP `serverInfo`.

Combine Roster MCP with other MCP servers (filesystem, memory, etc.) inside your client’s `mcpServers` map.

> npm package: **`@maslowai/roster`**. See [Quick start](01-quickstart.md) and [Configuration](02-configuration.md).

---

## Client configuration (Claude Desktop / Cursor-style)

```json
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "file",
        "PROMPTS_DIR": "/absolute/path/to/data/prompts"
      }
    }
  }
}
```

For **Convex**-backed prompts from MCP, set `STORAGE_TYPE=convex`, `CONVEX_URL`, and auth env vars per **[OPERATIONS.md](../OPERATIONS.md)**.

---

## Server-Sent Events (SSE) (experimental)

When `ENABLE_SSE` is set, the HTTP server may expose an SSE stream for prompt-related notifications (see `src/config.ts` and HTTP server wiring).

Example listener:

```javascript
const eventSource = new EventSource('http://localhost:3003/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('SSE:', data);
};

eventSource.onerror = () => eventSource.close();
```

Event shapes may change; treat as experimental.

---

## Related

- [API reference](04-api-reference.md) — HTTP mode
- [Workflow guide](09-workflow-guide.md)
- [OPERATIONS.md](../OPERATIONS.md) — Convex + auth
