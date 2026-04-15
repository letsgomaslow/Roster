# Roster MCP — backlog notes (Maslow AI)

> **Note:** This file mixes product positioning with an older task list. **Current product:** Roster MCP · npm `@maslowai/roster`. For Convex operations see [OPERATIONS.md](OPERATIONS.md).

## Project overview

Roster MCP is a prompt management MCP server: templates, versioning, and tool-based access for agents and IDEs.

## Integration scope

Related ecosystem work may reference separate IoT/voice/orchestration projects; treat those as **optional** integrations, not core to this package.

## Tasks (historical checklist)

### Phase 1: Prompt storage and management

- [ ] Design prompt storage format (YAML/JSON)
- [ ] Implement prompt versioning
- [ ] Create prompt library structure
- [ ] Add prompt tagging and categorization
- [ ] Implement prompt validation

### Phase 2: MCP integration

- [ ] Create MCP server for prompt management
- [ ] Implement prompt retrieval tools
- [ ] Implement prompt composition tools
- [ ] Add prompt injection detection

### Phase 3: Agent integration

- [ ] Connect with agent orchestration
- [ ] Implement dynamic prompt selection
- [ ] Add context-aware prompting
- [ ] Multi-agent prompt coordination

## Status

Much of the MCP surface is implemented in this repository; use the main [README.md](README.md) and [docs/index.md](docs/index.md) for current capabilities.

## See also

- External ecosystem projects (MIA, voice agents, orchestrators) — discover via your org’s documentation or package registry; URLs here are intentionally omitted to avoid stale third-party links.
