# Quick start — Roster MCP

Get **Roster MCP** (Maslow AI, npm **`@maslowai/roster`**) running in minutes: local `npx`, Docker, or **Convex** for a hosted backend.

> Architecture: hexagonal layout in `src/core` and `src/adapters`. See [Configuration](02-configuration.md), [Storage adapters](03-storage-adapters.md), and **[OPERATIONS.md](../OPERATIONS.md)** for Convex.

---

## 1. `npx` (quickest)

Uses the published package; default behavior depends on how the process is started (often HTTP on port 3003 when `MODE=http`).

```bash
npx -y @maslowai/roster
```

In another terminal (if HTTP is listening):

```bash
curl http://localhost:3003/health
```

**Useful variables:**

| Variable       | Example          | Description                          |
| -------------- | ---------------- | ------------------------------------ |
| `MODE`         | `http` / `mcp`   | `http` for REST; `mcp` for stdio MCP |
| `PORT`         | `3003`           | HTTP port                            |
| `STORAGE_TYPE` | `file`           | `file`, `memory`, `convex`, etc.     |
| `PROMPTS_DIR`  | `./data/prompts` | File storage root                    |
| `LOG_LEVEL`    | `info`           | Logging                              |

---

## 2. Docker (file storage + volume)

```bash
docker run -d --name roster-mcp \
  -p 3003:3003 \
  -e MODE=http \
  -e STORAGE_TYPE=file \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/roster/roster:latest
```

- Data under `./data` on the host.
- **Windows:** use `${PWD}` (PowerShell) or `%CD%` (cmd) instead of `$(pwd)`.
- Stop/remove: `docker rm -f roster-mcp`.

---

## 3. Convex (hosted / online)

Use **`STORAGE_TYPE=convex`** with your Convex deployment URL and authentication (Clerk or dev owner). Full checklist:

**[OPERATIONS.md](../OPERATIONS.md)**

Example shape:

```bash
export MODE=http
export STORAGE_TYPE=convex
export CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
# Plus Clerk keys or CONVEX_DEV_OWNER_USER_ID — see OPERATIONS.md
node dist/index.js
```

---

## 4. Docker Compose (file + local data)

`STORAGE_TYPE=postgres` is **not** enabled in the main `src/index.ts` entrypoint today. For Postgres-style deployments, use an external plan or contribute adapter wiring.

Example **file**-backed compose:

```yaml
services:
  roster:
    image: ghcr.io/roster/roster:latest
    ports:
      - '3003:3003'
    environment:
      MODE: http
      STORAGE_TYPE: file
    volumes:
      - ./data:/app/data
```

```bash
docker compose up -d
curl http://localhost:3003/health
```

---

## Next steps

- [Configuration](02-configuration.md)
- [Storage adapters](03-storage-adapters.md)
- [MCP integration](06-mcp-integration.md)
- [API reference](04-api-reference.md)
- [OPERATIONS.md](../OPERATIONS.md) — Convex, Clerk, import
