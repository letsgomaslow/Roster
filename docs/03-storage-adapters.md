# Storage adapters — Roster MCP

**Roster MCP** (Maslow AI) persists prompts through **adapters** selected by `STORAGE_TYPE`. The HTTP/MCP server wires adapters in [`src/index.ts`](../src/index.ts).

Configure env vars per [Configuration](02-configuration.md). For **Convex** auth, imports, and dashboard steps, see **[OPERATIONS.md](../OPERATIONS.md)**.

---

## Implemented

### `file` (default in schema)

- **Adapter:** [`FilePromptRepository`](../src/adapters/file/file-prompt-repository.ts), file catalog.
- **Use case:** Local development, human-readable JSON prompts under `PROMPTS_DIR`.

### `memory`

- **Adapter:** In-memory prompt store + file-backed catalog for index operations as wired in `src/index.ts`.
- **Use case:** Tests and ephemeral runs.

### `convex`

- **Adapter:** [`ConvexPromptRepository`](../src/adapters/convex/convex-prompt-repository.ts).
- **Use case:** **Hosted** prompt storage with Convex Cloud; supports Clerk JWT or dev owner mode.
- **Docs:** [OPERATIONS.md](../OPERATIONS.md).

### AWS (DynamoDB + S3 + SQS)

- **Trigger:** Any `STORAGE_TYPE` value that is **not** `file`, `memory`, `postgres`, or `convex` selects the AWS branch in `src/index.ts`.
- **Adapters:** DynamoDB, S3 catalog, SQS event bus.
- **Use case:** Serverless / AWS deployments; default **table/bucket names** are legacy resource identifiers (see [Configuration](02-configuration.md)).

---

## Not implemented in the main entrypoint

### `postgres`

`STORAGE_TYPE=postgres` currently **throws** in `src/index.ts` (“not yet implemented”). The Zod schema still allows the value for forward compatibility.

---

## Planned / conceptual (no adapter in `src/adapters` today)

- **MDC** (prompts as `.cursor/rules` markdown) — not wired to `STORAGE_TYPE`.
- **Elasticsearch** — not present in the current adapter set.

To add a backend, implement the port interfaces under `src/core/ports/` and branch in `src/index.ts`.

---

## Related

- [Configuration](02-configuration.md)
- [OPERATIONS.md](../OPERATIONS.md) — Convex
- [Developer guide](07-developer-guide.md) — extension patterns
