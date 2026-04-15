# Configuration — Roster MCP

**Roster MCP** (Maslow AI, npm `@maslowai/roster`) reads configuration from **environment variables**. The HTTP/MCP entrypoint in `src/index.ts` loads a subset through **`src/config.ts`** ([Zod](https://github.com/colinhacks/zod) schema). Additional variables (for example `MODE`, AWS resource names) are read directly where used.

For **Convex** deployments, Clerk vs dev-owner mode, and bulk import, use the runbook: **[OPERATIONS.md](../OPERATIONS.md)**.

---

## Runtime mode

| Variable | Values        | Default | Description                                                       |
| -------- | ------------- | ------- | ----------------------------------------------------------------- |
| `MODE`   | `mcp`, `http` | `mcp`   | `mcp` = stdio MCP server; `http` = Express REST API + MCP routes. |

---

## Core (Zod schema in `src/config.ts`)

| Variable       | Type   | Default     | Description                                   |
| -------------- | ------ | ----------- | --------------------------------------------- |
| `HOST`         | string | `0.0.0.0`   | HTTP bind host                                |
| `PORT`         | number | `3003`      | HTTP port                                     |
| `LOG_LEVEL`    | enum   | `info`      | `debug`, `info`, `warn`, `error`              |
| `STORAGE_TYPE` | enum   | `file`      | `file`, `memory`, `postgres`, `convex`        |
| `PROMPTS_DIR`  | string | `/app/data` | Prompt files root (file/memory catalog paths) |

### Optional HTTP / CORS / SSE

| Variable      | Description           |
| ------------- | --------------------- |
| `ENABLE_SSE`  | Enable SSE (optional) |
| `CORS_ORIGIN` | CORS allowed origin   |
| `SSE_PATH`    | SSE path              |

### Convex (`STORAGE_TYPE=convex`)

| Variable                    | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `CONVEX_URL`                | Deployment URL, e.g. `https://xxx.convex.cloud`                             |
| `CONVEX_DEV_OWNER_USER_ID`  | Dev/single-tenant owner id (must match Convex dashboard); see OPERATIONS.md |
| `CLERK_PUBLISHABLE_KEY`     | Clerk (with `CLERK_SECRET_KEY`) for JWT auth                                |
| `CLERK_SECRET_KEY`          | Clerk secret                                                                |
| `CLERK_CONVEX_JWT_TEMPLATE` | Optional; default template name `convex`                                    |

**Startup rules** (see `src/index.ts`): `CONVEX_URL` is required. You need **either** Clerk keys **or** `CONVEX_DEV_OWNER_USER_ID` (dev only).

### PostgreSQL (`STORAGE_TYPE=postgres`)

Postgres-related keys exist in the schema for future use. The current `src/index.ts` **throws** if `STORAGE_TYPE=postgres` is selected—use `file`, `memory`, or `convex` until Postgres is re-enabled.

| Variable                   | Description          |
| -------------------------- | -------------------- |
| `POSTGRES_HOST`            | Host                 |
| `POSTGRES_PORT`            | Port                 |
| `POSTGRES_DATABASE`        | Database name        |
| `POSTGRES_USER`            | User                 |
| `POSTGRES_PASSWORD`        | Password             |
| `POSTGRES_MAX_CONNECTIONS` | Pool size (optional) |
| `POSTGRES_SSL`             | Use SSL (optional)   |

### ElevenLabs (optional)

| Variable               | Description     |
| ---------------------- | --------------- |
| `ELEVENLABS_API_KEY`   | API key         |
| `ELEVENLABS_MODEL_ID`  | Model           |
| `ELEVENLABS_VOICE_ID`  | Voice           |
| `ELEVENLABS_CACHE_DIR` | Cache directory |

### Local HTTPS (optional, `MODE=http`)

| Variable               | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `HTTPS_KEY_PATH`       | PEM key path                                         |
| `HTTPS_CERT_PATH`      | PEM cert path                                        |
| `HTTPS_CA_PATH`        | Optional CA                                          |
| `HTTPS_KEY_PASSPHRASE` | Optional                                             |
| `DEV_LOCAL_HTTPS`      | Must be true with HTTPS paths when not in production |

---

## AWS (DynamoDB / S3 / SQS path)

When `STORAGE_TYPE` is **not** one of `file`, `memory`, `postgres`, or `convex`, `src/index.ts` uses the **AWS adapters** (legacy default branch). Typical variables:

| Variable           | Default (example)        | Description                                              |
| ------------------ | ------------------------ | -------------------------------------------------------- |
| `PROMPTS_TABLE`    | `mcp-prompts`            | DynamoDB table (**resource name**, not product branding) |
| `PROMPTS_BUCKET`   | `mcp-prompts-catalog`    | S3 catalog bucket                                        |
| `PROCESSING_QUEUE` | `mcp-prompts-processing` | SQS queue                                                |
| `AWS_REGION`       | —                        | AWS region                                               |

Use IAM roles in production; avoid long-lived keys.

---

## Not in `src/config.ts`

Older docs listed `NAME`, `HTTP_SERVER`, `MCP_SERVER`, `mdc`, `elasticsearch`, streaming, and sequence toggles. Those are **not** part of the current Zod schema. If you need them, confirm in source (`rg process.env` / `src/http-server.ts`) before relying on them.

---

## References

- Authoritative env schema: [`src/config.ts`](../src/config.ts)
- Convex operations: [`OPERATIONS.md`](../OPERATIONS.md)
- Storage overview: [Storage adapters](03-storage-adapters.md)
