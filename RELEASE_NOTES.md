# Release notes — v3.14.0 (Roster MCP · Maslow AI)

**npm package:** `@maslowai/roster`

## New release

**Date**: January 7, 2026  
**Version**: 3.14.0  
**Tag**: `v3.14.0`

## Published platforms

- **npm**: `@maslowai/roster@3.14.0`
- **GitHub Packages / Cloudsmith / Docker**: use your org’s registry names and tags

## 🆕 What's New

### 🚀 Major Architecture Improvements

#### Configurable Storage Backends (No AWS Dependency)

- **File Storage**: Local filesystem-based prompt storage
- **Memory Storage**: In-memory storage for testing/development
- **PostgreSQL Support**: Planned for future release
- **AWS Storage**: Optional, only when explicitly configured

#### Event Publishing Made Optional

- **Local Development**: No AWS services required
- **Configurable Event Bus**: Memory-based for local, SQS for cloud
- **Zero Breaking Changes**: Existing AWS deployments unaffected

#### New Storage Adapters

- `FilePromptRepository`: Persistent file-based storage
- `MemoryPromptRepository`: Volatile in-memory storage
- `MemoryEventBus`: Local event publishing (no AWS)
- `FileCatalogRepository`: Local catalog management

### 🔧 Technical Improvements

#### Build System Overhaul

- **CommonJS Migration**: Resolved ES module compatibility issues
- **Dynamic Imports**: AWS dependencies loaded only when needed
- **Improved Module Resolution**: Better Node.js compatibility

#### API Consistency Fixes

- **Tool Schema Alignment**: Fixed create_prompt parameter mapping
- **Error Handling**: Better validation and user feedback
- **MCP Compliance**: Enhanced protocol adherence

### 📊 Storage Type Comparison

| Feature              | File Storage  | Memory Storage | PostgreSQL  | AWS            |
| -------------------- | ------------- | -------------- | ----------- | -------------- |
| **AWS Dependency**   | ❌ None       | ❌ None        | ❌ None     | ✅ Required    |
| **Persistence**      | ✅ File-based | ❌ Ephemeral   | ✅ Database | ✅ S3/DynamoDB |
| **Performance**      | ⭐⭐⭐        | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐    | ⭐⭐           |
| **Setup Complexity** | ⭐⭐          | ⭐⭐⭐⭐⭐     | ⭐⭐⭐      | ⭐             |

### 🔒 Security & Compatibility

- **No Breaking Changes**: Existing AWS deployments continue working
- **Backward Compatible**: All existing APIs maintained
- **Local Development**: No AWS credentials required
- **Production Ready**: All storage types tested and validated

### 🐛 Bug Fixes

- Fixed ES module compatibility issues
- Resolved create_prompt tool parameter validation
- Corrected event publishing for local storage types
- Improved error messages and validation

---

# Release notes — v3.12.6 (historical)

**Current npm package:** `@maslowai/roster` (Roster MCP · Maslow AI). The publishing coordinates below describe the **v3.12.6** release era only.

## New release

**Date**: January 1, 2026  
**Version**: 3.12.6  
**Tag**: `v3.12.6`

## Published platforms (at time of release)

- **npm** and other registries: use your org’s package name and version tag for that era.
- **Docker**: use your registry’s image name and tag for v3.12.6.

## 🆕 What's New

### ESP32 Embedded Development Prompts

Added 6 atomic prompts for ESP32 development workflows:

- `esp32-network-ap-mode-configuration` - WiFi AP mode setup
- `esp32-platformio-serial-upload-debugging` - Build/upload troubleshooting
- `esp32-flatbuffers-schema-sync-workflow` - Schema regeneration
- `esp32-mcp-server-http-api-integration` - HTTP API setup
- `mcp-server-file-storage-index-sync` - Index synchronization
- `embedded-audio-fft-memory-constraints` - Memory optimization

### Meta-Workflow

- `embedded-esp32-full-bringup-workflow` - Complete ESP32 setup workflow combining all atomic prompts

### Self-Improving Learning Loop

- Validation script: `scripts/validate_learned_knowledge.sh`
- Index regeneration: `scripts/regenerate_index.py`
- Knowledge reusability map: `docs/knowledge-reusability-map.md`
- Implementation summary: `docs/self-improving-loop-implementation-summary.md`

### Publishing Infrastructure

- GitHub Packages publishing workflow
- Cloudsmith upload support
- Docker image publishing
- Comprehensive release workflow

## Installation (current)

```bash
pnpm add @maslowai/roster
# or
npm install @maslowai/roster
```

For v3.12.6-era artifacts, use the release assets and registry coordinates documented in that release’s notes in your source control history.

## Links

- **Current npm**: [https://www.npmjs.com/package/@maslowai/roster](https://www.npmjs.com/package/@maslowai/roster)

## 📊 Statistics

- **Total Prompts**: 46
- **New Prompts**: 7 (6 atomic + 1 meta-workflow)
- **Categories**: ESP32, Embedded, MCP Development
- **Documentation**: 4 new documentation files

## 🚀 Next Steps

1. Monitor GitHub Actions workflows for publication status
2. Verify packages are available on all platforms
3. Test installation from each platform
4. Update dependent projects to use new version
