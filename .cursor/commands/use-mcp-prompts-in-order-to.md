Use **Roster MCP** (npm [`@maslowai/roster`](https://www.npmjs.com/package/@maslowai/roster)) — Maslow AI’s prompt-management MCP server — and its tools in order.

Roster MCP is a Model Context Protocol server that stores, versions, and serves prompts with template variables (`{{name}}`), so agents and IDEs pull consistent instructions instead of duplicating them in every project.

**Hosted Convex:** see [OPERATIONS.md](../../OPERATIONS.md) and [docs/02-configuration.md](../../docs/02-configuration.md).

---

## Tools (call in a sensible order)

1. **`list_prompts`** — Discover what exists (optional: `tags`, `category`, `search`, `cursor`).
2. **`get_prompt`** — Load a prompt by `name`; pass `arguments` for templates.
3. **`create_prompt` / `update_prompt` / `delete_prompt`** — Mutate the library when the user wants persistence (respect product rules for writes).
4. **`apply_template`** — One-off substitution without storing.
5. **`get_stats`** — Library size and distribution.

---

## Workflow levels

**IDE (Cursor / Claude Desktop):** Add `roster` to `mcp.json` with `MODE=mcp` and `STORAGE_TYPE` (`file`, `memory`, or `convex` + Convex env). Prefer **`list_prompts` → `get_prompt`** before improvising long system prompts.

**Shared team server:** Same server, shared storage backend (file volume, Convex, or legacy AWS adapters with `STORAGE_TYPE` outside the four primary values — see [docs/03-storage-adapters.md](../../docs/03-storage-adapters.md)).

**Automation:** Scripts or CI call the same tools over MCP; keep discovery (`list_prompts`) before execution.

---

## System prompt snippet (for other agents)

```markdown
You can use Roster MCP tools for prompt templates. Before large bespoke instructions, call `list_prompts` with relevant tags, then `get_prompt` with the right `name` and template `arguments`. Prefer updating prompts with `update_prompt` when the user wants the library improved. Package: @maslowai/roster.
```

---

## Further reading (neutral)

- [Model Context Protocol — prompts concept](https://modelcontextprotocol.info/docs/concepts/prompts/)
- [Roster MCP configuration](../../docs/02-configuration.md)
- [MCP integration guide](../../docs/06-mcp-integration.md)

Discovery: run **`list_prompts`** against the live server — prompt counts and names depend on the connected library.
